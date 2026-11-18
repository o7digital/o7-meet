import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat, open, unlink } from 'node:fs/promises';
import { join, extname, resolve, relative } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { AccessToken } from 'livekit-server-sdk';
import { Store, ApiError, authorize, validId } from './store.mjs';
import { Identity } from './identity.mjs';
import { parseTranscript } from './transcript.mjs';
import { Pipeline, languages } from './pipeline.mjs';
import { exportDocument } from './exports.mjs';
import { Teams } from './teams.mjs';

const textExtensions = ['.vtt', '.srt', '.txt'];
const mediaExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.webm', '.ogg', '.flac', '.aac', '.mov', '.mkv', '.opus'];
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const send = (res, data, status = 200) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
async function json(req) {
  const chunks = []; let count = 0;
  for await (const chunk of req) { count += chunk.length; if (count > 32768) throw new ApiError(413, 'Requête trop volumineuse.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw new ApiError(400, 'JSON invalide.'); }
}
const brief = m => ({ id: m.id, title: m.title, meetingDate: m.meetingDate, createdAt: m.createdAt, ownerId: m.ownerId, recipientIds: m.recipientIds, status: m.status, source: m.source, targetLanguage: m.targetLanguage, error: m.error });
function publicMeeting(meeting) { const { audioChunks, translationParts, reportDraft, sourceFile, sourceHash, sourceKey, ...data } = meeting; return data; }

export async function createApplication({ env = process.env, root = resolve('dist'), authenticate, fetcher = fetch, verifier } = {}) {
  const store = new Store(env.MEET_DATA_DIR || resolve('data'));
  await store.init();
  const identity = new Identity(store, env, authenticate), teams = new Teams(store, env, fetcher, verifier), pipeline = new Pipeline(store, env, fetcher);
  await pipeline.init();
  const importing = new Set();
  async function importFile(user, params, stream, extra = {}) {
    if (importing.has(user.id)) throw new ApiError(409, 'Un import est déjà en cours pour ce compte.');
    importing.add(user.id); let path;
    try {
      const title = String(params.title || '').trim(), filename = String(params.filename || '').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 180), extension = extname(filename).toLowerCase();
      if (!title || title.length > 180) throw new ApiError(400, 'Indiquez un titre de 1 à 180 caractères.');
      if (!textExtensions.includes(extension) && !mediaExtensions.includes(extension)) throw new ApiError(415, 'Formats acceptés : VTT, SRT, TXT, audio ou vidéo avec piste audio.');
      if (!languages[params.targetLanguage]) throw new ApiError(400, 'Choisissez une langue de traduction.');
      if (params.originalLanguage && params.originalLanguage !== 'auto' && !languages[params.originalLanguage]) throw new ApiError(400, 'Langue originale invalide.');
      if (params.meetingDate && (!/^\d{4}-\d{2}-\d{2}$/.test(params.meetingDate) || !Number.isFinite(+new Date(params.meetingDate)))) throw new ApiError(400, 'Date de réunion invalide.');
      const existing = (await store.list('meetings')).filter(m => m.ownerId === user.id);
      if (existing.filter(m => !['complete', 'error', 'imported'].includes(m.status)).length >= 10) throw new ApiError(429, 'Dix traitements sont déjà en attente. Patientez avant d’importer.');
      if (extra.sourceKey) { const duplicate = existing.find(m => m.sourceKey === extra.sourceKey && m.targetLanguage === params.targetLanguage); if (duplicate) return { meeting: publicMeeting(duplicate), duplicate: true }; }
      const id = randomUUID(), sourceFile = `${id}${extension}`;
      path = join(store.root, 'sources', sourceFile);
      const file = await open(path, 'wx', 0o600), hash = createHash('sha256'); let size = 0;
      try {
        for await (const chunk of stream) {
          const data = Buffer.from(chunk); size += data.length;
          if (size > (textExtensions.includes(extension) ? 1024 * 1024 : 250 * 1024 * 1024)) throw new ApiError(413, 'Fichier trop volumineux : 1 Mo pour le texte, 250 Mo pour l’audio/vidéo.');
          hash.update(data); await file.writeFile(data);
        }
      } finally { await file.close(); }
      if (!size) throw new ApiError(422, 'Le fichier est vide.');
      const sourceHash = hash.digest('hex'), duplicate = existing.find(m => m.sourceHash === sourceHash && m.targetLanguage === params.targetLanguage && m.originalLanguage === (params.originalLanguage || 'auto'));
      if (duplicate) { await unlink(path); path = null; return { meeting: publicMeeting(duplicate), duplicate: true }; }
      const original = textExtensions.includes(extension) ? parseTranscript(await readFile(path), extension) : null;
      if (original && params.originalLanguage !== 'auto') original.language = params.originalLanguage || null;
      const now = new Date().toISOString();
      const meeting = { id, title, sourceFilename: filename, sourceFile, sourceHash, size, originalLanguage: params.originalLanguage || 'auto', targetLanguage: params.targetLanguage, meetingDate: params.meetingDate || null, ownerId: user.id, recipientIds: [], source: 'upload', createdAt: now, updatedAt: now, status: 'imported', original, ...extra };
      await store.put('meetings', id, meeting); path = null;
      return { meeting: publicMeeting(meeting), duplicate: false };
    } finally { importing.delete(user.id); if (path) await unlink(path).catch(() => {}); }
  }
  async function api(req, res, url) {
    const path = url.pathname.slice('/api/olivia'.length), method = req.method;
    if (method !== 'GET') identity.origin(req);
    if (path === '/login' && method === 'POST') return send(res, await identity.login(req, res, await json(req)));
    const session = await identity.require(req), user = session.user;
    if (path === '/session' && method === 'GET') return send(res, { user, csrf: session.csrf, users: identity.users, capabilities: { transcription: Boolean(env.OPENAI_API_KEY), translation: Boolean(env.OPENAI_API_KEY), model: env.OLIVIA_MEET_MODEL || 'gpt-4o', languages, maxMediaMb: 250, maxHours: 4, mailNotifications: false } });
    if (method !== 'GET') identity.csrf(req, session);
    if (path === '/logout' && method === 'POST') return send(res, await identity.logout(req, res, session));
    if (path === '/meetings' && method === 'GET') return send(res, { meetings: (await store.list('meetings')).filter(m => m.ownerId === user.id || m.recipientIds.includes(user.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(brief) });
    if (path === '/meetings' && method === 'POST') return send(res, await importFile(user, Object.fromEntries(url.searchParams), req), 201);
    const matched = path.match(/^\/meetings\/([^/]+)(?:\/(process|recipients|export|source))?$/);
    if (matched) {
      const [, id, action] = matched;
      if (!validId(id)) throw new ApiError(404, 'Document introuvable ou accès non autorisé.');
      const meeting = authorize(await store.get('meetings', id), user, method !== 'GET');
      if (!action && method === 'GET') return send(res, { meeting: publicMeeting(meeting) });
      if (action === 'process' && method === 'POST') { await pipeline.enqueue(meeting); return send(res, { meeting: publicMeeting(meeting) }, 202); }
      if (action === 'recipients' && method === 'PUT') {
        const body = await json(req);
        if (!Array.isArray(body.recipientIds) || body.recipientIds.some(id => !identity.users.find(u => u.id === id))) throw new ApiError(400, 'Sélectionnez uniquement des identités vérifiées.');
        const updated = await store.update('meetings', id, current => ({ ...current, recipientIds: [...new Set(body.recipientIds)].filter(id => id !== user.id) })); return send(res, { meeting: publicMeeting(updated) });
      }
      if (action === 'export' && method === 'GET') {
        const kind = url.searchParams.get('kind') || 'all', format = url.searchParams.get('format') || 'docx';
        const output = await exportDocument(meeting, kind, format);
        res.writeHead(200, { 'content-type': output.mime, 'content-disposition': `attachment; filename="olivia-${kind}-${id}.${format}"`, 'content-length': output.data.length }); res.end(output.data); return;
      }
      if (action === 'source' && method === 'GET') {
        const file = join(store.root, 'sources', meeting.sourceFile), details = await stat(file);
        res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="source-${id}${extname(file)}"`, 'content-length': details.size }); createReadStream(file).on('error', () => res.destroy()).pipe(res); return;
      }
      if (!action && method === 'DELETE') {
        if (pipeline.active.has(id)) throw new ApiError(409, 'Attendez la fin du traitement avant de supprimer ce document.');
        await store.delete('meetings', id); await unlink(join(store.root, 'sources', meeting.sourceFile)).catch(() => {}); return send(res, { ok: true });
      }
    }
    if (path === '/teams/status' && method === 'GET') return send(res, await teams.status(user.id));
    if (path === '/teams/connect' && method === 'POST') return send(res, await teams.connect(session, (await json(req)).recordings === true));
    if (path === '/teams/disconnect' && method === 'POST') return send(res, await teams.disconnect(user.id));
    if (path === '/teams/callback' && method === 'GET') {
      try { await teams.callback(session, url.searchParams); res.writeHead(303, { location: '/import?teams=connected', 'referrer-policy': 'no-referrer' }); res.end(); }
      catch (e) { res.writeHead(303, { location: `/import?teamsError=${encodeURIComponent(e instanceof ApiError ? e.message : 'Connexion Microsoft impossible. Réessayez.')}`, 'referrer-policy': 'no-referrer' }); res.end(); }
      return;
    }
    if (path === '/teams/meetings' && method === 'GET') return send(res, { meetings: await teams.meetings(user.id, url.searchParams.get('start'), url.searchParams.get('end')) });
    if (path === '/teams/artifacts' && method === 'GET') return send(res, await teams.artifacts(user.id, url.searchParams.get('eventId') || ''));
    if (path === '/teams/import' && method === 'POST') {
      const body = await json(req);
      if (!body.eventId || !body.artifactId || !languages[body.targetLanguage]) throw new ApiError(400, 'Sélectionnez une réunion, son contenu et la langue cible.');
      const content = await teams.content(user.id, body.eventId, body.artifactId, body.kind);
      const result = await importFile(user, { title: content.title, filename: body.kind === 'transcript' ? 'teams.vtt' : 'teams.mp4', meetingDate: content.date, targetLanguage: body.targetLanguage, originalLanguage: 'auto' }, content.response.body, { source: 'teams', sourceKey: content.sourceKey, speakerAttribution: content.attributed });
      if (result.duplicate) await content.response.body?.cancel().catch(() => {});
      return send(res, result, 201);
    }
    throw new ApiError(404, 'Route introuvable.');
  }
  const server = createServer(async (req, res) => {
    res.setHeader('cache-control', 'no-store'); res.setHeader('x-content-type-options', 'nosniff'); res.setHeader('referrer-policy', 'no-referrer'); res.setHeader('x-frame-options', 'DENY');
    res.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/olivia/') || url.pathname === '/api/olivia') return await api(req, res, url);
      if (url.pathname.startsWith('/api/')) throw new ApiError(404, 'Route introuvable.');
      if (url.pathname === '/healthz') return send(res, { status: 'ok', service: 'o7-meet', version: env.RELEASE_SHA || 'development', media: Boolean(env.LIVEKIT_URL), olivia: true });
      if (url.pathname === '/config.json') return send(res, { livekitUrl: env.LIVEKIT_URL || '', turnUrls: env.TURN_URLS?.split(',').filter(Boolean) || [], turnUsername: env.TURN_USERNAME || '', turnCredential: env.TURN_PASSWORD || '' });
      if (url.pathname === '/token') {
        const room = url.searchParams.get('room'), name = (url.searchParams.get('identity') || '').slice(0, 100);
        if (!room || !name || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) throw new ApiError(400, 'Room, identity and LiveKit configuration required.');
        const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, { identity: name, name }); token.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, roomCreate: true });
        return send(res, { token: await token.toJwt(), url: env.LIVEKIT_URL || '' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new ApiError(405, 'Méthode non autorisée.');
      const summary = url.pathname.match(/^\/summary\/([^/]+)$/);
      if (summary && validId(summary[1])) {
        let session;
        try { session = await identity.require(req); } catch (e) { if (e.status !== 401) throw e; res.writeHead(303, { location: `/import?document=${summary[1]}` }); res.end(); return; }
        authorize(await store.get('meetings', summary[1]), session.user);
      }
      const decoded = decodeURIComponent(url.pathname), candidate = resolve(root, `.${decoded}`);
      if (relative(root, candidate).startsWith('..') || decoded.includes('\0') || decoded.split('/').some(p => p.startsWith('.'))) throw new ApiError(404, 'Page introuvable.');
      let file;
      if (decoded.startsWith('/assets/')) { if (!(await stat(candidate).catch(() => null))?.isFile()) throw new ApiError(404, 'Fichier introuvable.'); file = candidate; }
      else if (/^\/(?:import|meetings|new|join)?$/.test(decoded) || /^\/(?:m|summary)\/[^/]+$/.test(decoded)) file = join(root, 'index.html');
      else throw new ApiError(404, 'Page introuvable.');
      const info = await stat(file); res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'content-length': info.size });
      if (req.method === 'HEAD') res.end(); else createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      if (!(error instanceof ApiError)) console.error(JSON.stringify({ event: 'request.error', code: error.code || error.name }));
      send(res, { error: error instanceof ApiError ? error.message : 'Erreur serveur. Réessayez ; les résultats existants sont conservés.', code: error.code || 'SERVER_ERROR' }, error instanceof ApiError ? error.status : 500);
    }
  });
  server.requestTimeout = 900000;
  return { server, store, identity, pipeline, teams };
}
