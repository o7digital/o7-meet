import { randomBytes, createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiError, digest } from './store.mjs';

const graphRoot = 'https://graph.microsoft.com/v1.0';
const baseScopes = ['openid', 'profile', 'offline_access', 'Calendars.ReadBasic', 'OnlineMeetings.Read', 'OnlineMeetingTranscript.Read.All'];
const enc = encodeURIComponent;
export function graphError(status, payload = {}) {
  const code = payload.error?.innerError?.code || payload.error?.innererror?.code || payload.error?.code;
  if (code === 'GraphAccessToTranscriptsDisabled') return new ApiError(403, 'L’administrateur Teams a désactivé l’accès Graph aux transcriptions pour cette organisation.', code);
  if (code === 'SpeakerAttributionNotAllowed') return new ApiError(403, 'L’administrateur Teams masque les intervenants. Le format sans noms sera utilisé.', code);
  if (status === 401) return new ApiError(401, 'La connexion Microsoft a expiré ou a été révoquée. Reconnectez Microsoft.', 'MICROSOFT_RECONNECT');
  if (status === 403) return new ApiError(403, 'Microsoft refuse l’accès. Vérifiez le consentement administrateur, les règles Teams et votre présence dans l’invitation. Un lien Teams seul ne donne aucun droit.', 'MICROSOFT_FORBIDDEN');
  if (status === 404) return new ApiError(404, 'Contenu Teams introuvable, expiré ou pas encore publié. Réessayez après la réunion.', 'MICROSOFT_NOT_READY');
  if (status === 429) return new ApiError(429, 'Microsoft limite les requêtes. Patientez puis réessayez.', 'MICROSOFT_THROTTLED');
  return new ApiError(502, `Microsoft Graph est indisponible (HTTP ${status}). Réessayez plus tard.`, 'MICROSOFT_ERROR');
}

export class Teams {
  constructor(store, env, fetcher = fetch, verifier) { this.store = store; this.env = env; this.fetch = fetcher; this.verifier = verifier; this.refreshing = new Map(); }
  missing() {
    const fields = ['MICROSOFT_TENANT_ID', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'APP_ORIGIN'];
    return fields.filter(k => !this.env[k]);
  }
  ensureConfig() {
    const missing = this.missing();
    if (missing.length) throw new ApiError(503, `Connecteur Microsoft non configuré : ${missing.join(', ')}. L’import manuel reste disponible.`, 'MICROSOFT_NOT_CONFIGURED');
    if (!/^[a-f0-9-]{36}$/i.test(this.env.MICROSOFT_TENANT_ID)) throw new ApiError(503, 'MICROSOFT_TENANT_ID doit être l’identifiant de votre organisation Microsoft (UUID).');
  }
  redirectUri() { return `${this.env.APP_ORIGIN}/api/olivia/teams/callback`; }
  authority() { return `https://login.microsoftonline.com/${enc(this.env.MICROSOFT_TENANT_ID)}/oauth2/v2.0`; }
  async connection(userId) { const item = await this.store.get('microsoft', userId); return item?.sealed ? this.store.open(item.sealed) : null; }
  async persist(userId, connection) { await this.store.put('microsoft', userId, { sealed: this.store.seal(connection) }); }
  async status(userId) {
    const connection = await this.connection(userId);
    return { configured: !this.missing().length, missing: this.missing(), connected: Boolean(connection), account: connection?.account || null, recordings: connection?.scopes?.includes('OnlineMeetingRecording.Read.All') || false, redirectUri: this.redirectUri() };
  }
  async connect(session, recordings = false) {
    this.ensureConfig();
    const state = randomBytes(32).toString('hex'), nonce = randomBytes(32).toString('hex'), verifier = randomBytes(48).toString('base64url');
    const scopes = [...baseScopes, ...(recordings ? ['OnlineMeetingRecording.Read.All'] : [])];
    await this.store.put('microsoft', `state_${digest(state)}`, { sealed: this.store.seal({ userId: session.user.id, sessionId: session.sessionId, nonce, verifier, scopes, expires: Date.now() + 600000 }) });
    const query = new URLSearchParams({ client_id: this.env.MICROSOFT_CLIENT_ID, response_type: 'code', redirect_uri: this.redirectUri(), response_mode: 'query', scope: scopes.join(' '), state, nonce, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
    return { url: `${this.authority()}/authorize?${query}` };
  }
  async token(form) {
    const response = await this.fetch(`${this.authority()}/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: this.env.MICROSOFT_CLIENT_ID, client_secret: this.env.MICROSOFT_CLIENT_SECRET, ...form }), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new ApiError(401, 'Microsoft n’a pas accepté la connexion. Reconnectez votre compte professionnel et vérifiez le consentement administrateur.', 'MICROSOFT_RECONNECT');
    const result = await response.json();
    if (!result.access_token) throw new ApiError(502, 'Microsoft n’a pas retourné de jeton d’accès.');
    return result;
  }
  async callback(session, query) {
    this.ensureConfig();
    const state = query.get('state');
    if (!state || !/^[a-f0-9]{64}$/.test(state)) throw new ApiError(400, 'État de connexion Microsoft invalide. Recommencez la connexion.');
    const key = `state_${digest(state)}`, item = await this.store.get('microsoft', key);
    if (!item) throw new ApiError(400, 'La connexion Microsoft a expiré ou a déjà été utilisée.');
    const data = this.store.open(item.sealed);
    if (data.expires < Date.now() || data.userId !== session.user.id || data.sessionId !== session.sessionId) throw new ApiError(403, 'Cette connexion Microsoft n’appartient pas à votre session.');
    await this.store.delete('microsoft', key);
    if (query.get('error')) throw new ApiError(403, 'Connexion Microsoft refusée. Le compte professionnel ou le consentement administrateur n’autorise pas ces accès.', 'MICROSOFT_CONSENT_DENIED');
    if (!query.get('code')) throw new ApiError(400, 'Code Microsoft absent.');
    const result = await this.token({ grant_type: 'authorization_code', code: query.get('code'), redirect_uri: this.redirectUri(), code_verifier: data.verifier, scope: data.scopes.join(' ') });
    let claims;
    try {
      const issuer = `https://login.microsoftonline.com/${this.env.MICROSOFT_TENANT_ID}/v2.0`;
      claims = this.verifier ? await this.verifier(result.id_token) : (await jwtVerify(result.id_token, createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${this.env.MICROSOFT_TENANT_ID}/discovery/v2.0/keys`)), { audience: this.env.MICROSOFT_CLIENT_ID, issuer })).payload;
      if (claims.nonce !== data.nonce || claims.tid !== this.env.MICROSOFT_TENANT_ID || !claims.oid) throw new Error('Invalid claims');
    } catch { throw new ApiError(401, 'L’identité Microsoft n’a pas pu être vérifiée.', 'MICROSOFT_IDENTITY_INVALID'); }
    await this.persist(session.user.id, { accessToken: result.access_token, refreshToken: result.refresh_token, expires: Date.now() + Number(result.expires_in || 3600) * 1000, scopes: (result.scope || data.scopes.join(' ')).split(' '), account: { name: claims.name || 'Compte professionnel', username: claims.preferred_username || '', objectId: claims.oid, tenantId: claims.tid } });
  }
  async refresh(userId, connection) {
    if (this.refreshing.has(userId)) return this.refreshing.get(userId);
    const promise = (async () => {
      if (!connection.refreshToken) throw graphError(401);
      const result = await this.token({ grant_type: 'refresh_token', refresh_token: connection.refreshToken });
      const updated = { ...connection, accessToken: result.access_token, refreshToken: result.refresh_token || connection.refreshToken, expires: Date.now() + Number(result.expires_in || 3600) * 1000, scopes: result.scope?.split(' ') || connection.scopes };
      await this.persist(userId, updated); return updated;
    })();
    this.refreshing.set(userId, promise);
    try { return await promise; } finally { this.refreshing.delete(userId); }
  }
  async request(userId, path, accept = 'application/json', retry = true) {
    this.ensureConfig();
    const address = new URL(path.startsWith('https://') ? path : `${graphRoot}${path}`);
    if (address.origin !== 'https://graph.microsoft.com' || !address.pathname.startsWith('/v1.0/')) throw new ApiError(400, 'URL Graph non autorisée.');
    let connection = await this.connection(userId);
    if (!connection) throw new ApiError(401, 'Connectez votre compte Microsoft professionnel.', 'MICROSOFT_RECONNECT');
    if (connection.expires < Date.now() + 60000) connection = await this.refresh(userId, connection);
    const response = await this.fetch(address, { headers: { authorization: `Bearer ${connection.accessToken}`, accept }, signal: AbortSignal.timeout(120000) });
    if (response.status === 401 && retry) { await this.refresh(userId, connection); return this.request(userId, path, accept, false); }
    if (!response.ok) { let payload; try { payload = await response.json(); } catch {} throw graphError(response.status, payload); }
    return response;
  }
  async collection(userId, path, limit = 1000) {
    const items = []; let next = path;
    while (next) {
      const response = await (await this.request(userId, next)).json();
      items.push(...(response.value || [])); next = response['@odata.nextLink'];
      if (next && items.length >= limit) throw new ApiError(413, 'Trop de réunions : réduisez la période de recherche.');
    }
    return items;
  }
  async meetings(userId, start, end) {
    const from = new Date(start || Date.now() - 30 * 86400000), until = new Date(end || Date.now() + 7 * 86400000);
    if (!Number.isFinite(+from) || !Number.isFinite(+until) || +until < +from || +until - +from > 93 * 86400000) throw new ApiError(400, 'Choisissez une période valide de 93 jours au maximum.');
    const query = new URLSearchParams({ startDateTime: from.toISOString(), endDateTime: until.toISOString(), '$select': 'id,subject,start,end,organizer,isOnlineMeeting,onlineMeeting', '$top': '100' });
    return (await this.collection(userId, `/me/calendarView?${query}`)).filter(e => e.isOnlineMeeting && e.onlineMeeting?.joinUrl).map(e => ({ id: e.id, title: e.subject, start: e.start, end: e.end, organizer: e.organizer?.emailAddress }));
  }
  async resolve(userId, eventId) {
    const event = await (await this.request(userId, `/me/events/${enc(eventId)}?$select=id,subject,start,onlineMeeting`)).json();
    const url = event.onlineMeeting?.joinUrl;
    if (!url) throw new ApiError(404, 'Cet événement ne contient pas de réunion Teams.');
    const filter = new URLSearchParams({ '$filter': `JoinWebUrl eq '${url.replaceAll("'", "''")}'` });
    const meetings = await this.collection(userId, `/me/onlineMeetings?${filter}`);
    if (!meetings[0]?.id) throw new ApiError(403, 'Microsoft ne rend pas cette réunion accessible à votre compte. Vérifiez votre invitation et les droits de l’organisateur.');
    return { event, meetingId: meetings[0].id };
  }
  async artifacts(userId, eventId) {
    const { meetingId, event } = await this.resolve(userId, eventId);
    let transcripts = [], transcriptError = null;
    try { transcripts = await this.collection(userId, `/me/onlineMeetings/${enc(meetingId)}/transcripts`); } catch (e) { if (e.status === 401) throw e; transcriptError = e.message; }
    const connection = await this.connection(userId); let recordings = [], recordingError = null;
    if (connection.scopes.includes('OnlineMeetingRecording.Read.All')) {
      try { recordings = await this.collection(userId, `/me/onlineMeetings/${enc(meetingId)}/recordings`); } catch (e) { recordingError = e.message; }
    }
    const summarize = items => items.map(item => ({ id: item.id, createdAt: item.createdDateTime }));
    return { title: event.subject, transcripts: summarize(transcripts), recordings: summarize(recordings), transcriptError, recordingError, message: !transcripts.length && !recordings.length && !transcriptError && !recordingError ? 'Aucun contenu disponible. Teams doit produire la transcription ou l’enregistrement et terminer sa publication.' : null };
  }
  async content(userId, eventId, artifactId, kind) {
    if (!['transcript', 'recording'].includes(kind)) throw new ApiError(400, 'Type de contenu Teams invalide.');
    if (kind === 'recording') {
      const connection = await this.connection(userId);
      if (!connection?.scopes.includes('OnlineMeetingRecording.Read.All')) throw new ApiError(403, 'Reconnectez Microsoft en activant l’accès optionnel aux enregistrements.', 'MICROSOFT_RECORDING_CONSENT');
    }
    const { meetingId, event } = await this.resolve(userId, eventId);
    const collection = kind === 'transcript' ? 'transcripts' : 'recordings';
    const path = `/me/onlineMeetings/${enc(meetingId)}/${collection}/${enc(artifactId)}/content`;
    let response, attributed = true;
    try { response = await this.request(userId, path, kind === 'transcript' ? 'text/vtt' : 'video/mp4'); }
    catch (e) {
      if (kind !== 'transcript' || e.code !== 'SpeakerAttributionNotAllowed') throw e;
      response = await this.request(userId, path, 'application/vnd.microsoft.graph.transcript+text'); attributed = false;
    }
    return { response, title: event.subject, date: event.start?.dateTime?.slice(0, 10), attributed, sourceKey: digest(`${connectionIdentity(await this.connection(userId))}:${meetingId}:${kind}:${artifactId}`) };
  }
  async disconnect(userId) { await this.store.delete('microsoft', userId); return { ok: true }; }
}
function connectionIdentity(connection) { return `${connection.account.tenantId}:${connection.account.objectId}`; }
