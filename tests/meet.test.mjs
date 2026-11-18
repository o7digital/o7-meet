import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseTranscript, transcriptText } from '../server/transcript.mjs';
import { exportDocument } from '../server/exports.mjs';
import { createApplication } from '../server/app.mjs';
import { validateReport } from '../server/pipeline.mjs';
import { Store, digest } from '../server/store.mjs';
import { Teams, graphError } from '../server/teams.mjs';
const vtt = `WEBVTT\n\n1\n00:00:01.125 --> 00:00:03.900\n<v Olivier>La réunion porte sur le devis.</v>\n\n2\n00:00:04.000 --> 00:00:08.500\n<v Laetitia>Nous décidons de valider le devis. Olivier enverra le devis vendredi.</v>\n`;
const users = [{ id: 'alice', name: 'Alice', email: 'alice@example.test' }, { id: 'bob', name: 'Bob', email: 'bob@example.test' }, { id: 'eve', name: 'Eve', email: 'eve@example.test' }];
const jsonResponse = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const envFor = root => ({ MEET_DATA_DIR: root, APP_ORIGIN: 'http://127.0.0.1', MEET_IDENTITIES_JSON: JSON.stringify(users), OPENAI_API_KEY: 'test-provider-only' });

test('Teams VTT preserves speakers, milliseconds, multiline text and unicode; SRT and UTF-16 import', () => {
  const result = parseTranscript(Buffer.from(vtt), '.vtt');
  assert.equal(result.segments[0].speaker, 'Olivier'); assert.equal(result.segments[1].speaker, 'Laetitia'); assert.equal(result.segments[0].start, 1.125); assert.equal(result.segments[0].end, 3.9);
  assert.match(transcriptText(result), /00:00:01\.125/);
  const srt = parseTranscript(Buffer.from('1\n00:00:02,500 --> 00:00:04,125\nLaetitia: Première ligne\ndeuxième ligne\n'), '.srt');
  assert.equal(srt.segments[0].speaker, 'Laetitia'); assert.equal(srt.segments[0].text, 'Première ligne\ndeuxième ligne');
  const txt = parseTranscript(Buffer.concat([Buffer.from([255, 254]), Buffer.from('Olivier: Décision à vérifier.', 'utf16le')]), '.txt');
  assert.equal(txt.segments[0].text, 'Décision à vérifier.');
  assert.throws(() => parseTranscript(Buffer.from('not a subtitle'), '.vtt'), /Aucun sous-titre/);
  assert.throws(() => parseTranscript(Buffer.from([0xff, 0xff, 0]), '.txt'), /Encodage/);
  const long = 'un très long paragraphe '.repeat(1000); const parsed = parseTranscript(Buffer.from(long), '.txt'); assert.equal(parsed.segments.map(s => s.text).join(''), long.trim());
});

test('report requires actual transcript evidence and never invents a missing owner or deadline', () => {
  assert.throws(() => validateReport({ topics: [], decisions: [{ text: 'Invented', evidence: 'A nonexistent agreement' }], actions: [] }, vtt), /citation/);
  const result = validateReport({ topics: [], decisions: [], actions: [{ text: 'Envoyer', evidence: 'Olivier enverra le devis vendredi.', owner: 'Alice', deadline: '2026-11-20' }] }, vtt);
  assert.equal(result.actions[0].owner, null); assert.equal(result.actions[0].deadline, null);
});

test('authenticated import → translation → report → summary, resume, exports, dedup and ACL', async t => {
  const root = await mkdtemp(join(tmpdir(), 'meet-test-')); let failTranslation = true; const calls = [];
  const fetcher = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    const request = JSON.parse(options.body), prompt = request.messages[0].content.split('TASK REQUIREMENTS:\n')[1];
    if (prompt.startsWith('Translate')) {
      calls.push('translation'); if (failTranslation) return new Response('{}', { status: 503 });
      return jsonResponse({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ segments: JSON.parse(request.messages[1].content.replace('TRANSCRIPT DATA:\n', '')).map(s => ({ ...s, text: `Translated: ${s.text}` })) }) } }] });
    }
    calls.push(prompt.startsWith('Write a meeting report') ? 'report' : 'summary');
    const result = prompt.startsWith('Write a meeting report') ? { topics: ['Devis'], decisions: [{ text: 'Valider le devis', evidence: 'Nous décidons de valider le devis.' }], actions: [{ text: 'Envoyer le devis', owner: 'Olivier', deadline: 'vendredi', evidence: 'Olivier enverra le devis vendredi.' }] } : { summary: 'Le devis est validé.' };
    return jsonResponse({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] });
  };
  const app = await createApplication({ env: envFor(root), root: join(process.cwd(), 'dist'), authenticate: async (_email, password) => { if (password !== 'correct') throw new Error('bad password'); }, fetcher });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve)); const base = `http://127.0.0.1:${app.server.address().port}`;
  t.after(async () => { await app.pipeline.tail; await new Promise(resolve => app.server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  async function request(path, options = {}, session) {
    return fetch(base + path, { redirect: 'manual', ...options, headers: { origin: 'http://127.0.0.1', ...(session ? { cookie: session.cookie, 'x-meet-csrf': session.csrf } : {}), ...options.headers } });
  }
  async function login(email) { const response = await request('/api/olivia/login', { method: 'POST', body: JSON.stringify({ email, password: 'correct' }) }); assert.equal(response.status, 200); return { cookie: response.headers.get('set-cookie').split(';')[0], csrf: (await response.json()).csrf }; }
  const alice = await login(users[0].email), bob = await login(users[1].email), eve = await login(users[2].email);
  assert.equal((await request('/api/olivia/meetings')).status, 401);
  assert.equal((await request('/api/olivia/meetings', { method: 'POST', headers: { cookie: alice.cookie } })).status, 403);
  assert.equal((await request('/api/olivia/login', { method: 'POST', headers: { origin: 'https://evil.test' }, body: '{}' })).status, 403);
  const params = new URLSearchParams({ title: 'Réunion privée', filename: 'teams.vtt', targetLanguage: 'en', originalLanguage: 'fr' });
  const imported = await request(`/api/olivia/meetings?${params}`, { method: 'POST', body: vtt }, alice); assert.equal(imported.status, 201);
  let meeting = (await imported.json()).meeting; const id = meeting.id;
  assert.equal(meeting.recipientIds.length, 0); assert.equal(meeting.original.segments[1].speaker, 'Laetitia'); assert.equal(meeting.sourceFile, undefined);
  const repeated = await request(`/api/olivia/meetings?${params}`, { method: 'POST', body: vtt }, alice); assert.equal((await repeated.json()).meeting.id, id);
  for (const suffix of ['', '/source', '/export?kind=original&format=txt']) assert.equal((await request(`/api/olivia/meetings/${id}${suffix}`, {}, bob)).status, 404);
  assert.equal((await request(`/summary/${id}`, {}, bob)).status, 404);
  assert.equal((await request(`/summary/${id}`)).status, 303);
  assert.equal((await request(`/sources/${id}.vtt`, {}, alice)).status, 404);
  assert.equal((await request('/.encryption-key', {}, alice)).status, 404);
  assert.equal((await request('/api/not-real', {}, alice)).status, 404);
  assert.equal((await request(`/api/olivia/meetings/${id}/export?kind=report&format=docx`, {}, alice)).status, 409);
  const runPipeline = () => request(`/api/olivia/meetings/${id}/process`, { method: 'POST', body: '{}' }, alice);
  await Promise.all([runPipeline(), runPipeline()]); await app.pipeline.tail;
  meeting = (await (await request(`/api/olivia/meetings/${id}`, {}, alice)).json()).meeting;
  assert.equal(meeting.status, 'error'); assert.equal(meeting.failedStage, 'translating'); assert.ok(meeting.original); assert.equal(calls.length, 1);
  failTranslation = false; await runPipeline(); await app.pipeline.tail;
  meeting = (await (await request(`/api/olivia/meetings/${id}`, {}, alice)).json()).meeting;
  assert.equal(meeting.status, 'complete'); assert.deepEqual(calls, ['translation', 'translation', 'report', 'translation', 'summary']);
  assert.equal(meeting.translation.segments[0].start, 1.125); assert.equal(meeting.translation.segments[1].speaker, 'Laetitia'); assert.equal(meeting.report.actions[0].deadline, 'vendredi');
  await runPipeline(); await app.pipeline.tail; assert.equal(calls.length, 5);
  for (const kind of ['original', 'translation', 'report', 'summary', 'all']) for (const format of ['txt', 'docx']) {
    const response = await request(`/api/olivia/meetings/${id}/export?${new URLSearchParams({ kind, format })}`, {}, alice); assert.equal(response.status, 200);
    const data = Buffer.from(await response.arrayBuffer());
    if (format === 'txt') { assert.equal(data[0], 239); assert.match(data.toString('utf8'), /Réunion privée/); }
    else { assert.equal(data.subarray(0, 2).toString(), 'PK'); const path = join(root, `${kind}.docx`); await writeFile(path, data); const xml = execFileSync('unzip', ['-p', path, 'word/document.xml'], { encoding: 'utf8' }); assert.match(xml, /Réunion privée/); assert.match(xml, /w:document/); }
  }
  const share = ids => request(`/api/olivia/meetings/${id}/recipients`, { method: 'PUT', body: JSON.stringify({ recipientIds: ids }) }, alice);
  assert.equal((await share(['unknown'])).status, 400); assert.equal((await share(['bob'])).status, 200);
  assert.equal((await request(`/api/olivia/meetings/${id}/export?kind=all&format=docx`, {}, bob)).status, 200);
  assert.equal((await request(`/api/olivia/meetings/${id}/process`, { method: 'POST' }, bob)).status, 404);
  assert.equal((await request(`/api/olivia/meetings/${id}`, {}, eve)).status, 404);
  assert.equal((await (await request('/api/olivia/meetings', {}, eve)).json()).meetings.length, 0);
  await share([]); assert.equal((await request(`/api/olivia/meetings/${id}/source`, {}, bob)).status, 404);
  const teamStatus = await (await request('/api/olivia/teams/status', {}, alice)).json(); assert.equal(teamStatus.configured, false); assert.ok(teamStatus.missing.includes('MICROSOFT_CLIENT_ID'));
  assert.equal((await request('/api/olivia/teams/connect', { method: 'POST', body: '{}' }, alice)).status, 503);
  await request('/api/olivia/logout', { method: 'POST' }, alice); assert.equal((await request(`/api/olivia/meetings/${id}`, {}, alice)).status, 401);
});

test('missing AI configuration keeps original available and returns an honest error', async t => {
  const root = await mkdtemp(join(tmpdir(), 'meet-unconfigured-')), env = envFor(root); delete env.OPENAI_API_KEY;
  const app = await createApplication({ env }); t.after(() => rm(root, { recursive: true, force: true }));
  const id = '3d348f3a-fbeb-4a54-8c0a-777239e02fe3';
  await app.store.put('meetings', id, { id, status: 'imported', recipientIds: [], original: parseTranscript(Buffer.from(vtt), '.vtt'), targetLanguage: 'en' });
  await app.pipeline.enqueue(await app.store.get('meetings', id)); await app.pipeline.tail;
  const meeting = await app.store.get('meetings', id); assert.equal(meeting.status, 'error'); assert.match(meeting.error, /OPENAI_API_KEY/); assert.equal(meeting.summary, undefined); assert.equal(meeting.report, undefined); assert.ok(meeting.original);
});

test('Microsoft handles admin refusal, missing scopes, expired tokens, speaker policy and dedup source identity', async t => {
  const root = await mkdtemp(join(tmpdir(), 'meet-graph-')), store = new Store(root); await store.init(); t.after(() => rm(root, { recursive: true, force: true }));
  const env = { ...envFor(root), MICROSOFT_CLIENT_ID: 'client', MICROSOFT_CLIENT_SECRET: 'secret', MICROSOFT_TENANT_ID: '4e3de6cb-b1e7-457e-8766-0bd4514e5d1d' };
  let refreshes = 0, contentRequests = 0; const accounts = { tenantId: env.MICROSOFT_TENANT_ID, objectId: 'object' };
  const fetcher = async (url, options) => {
    const address = String(url);
    if (address.includes('/token')) { refreshes++; return jsonResponse({ access_token: 'refreshed', refresh_token: 'rotated', expires_in: 3600 }); }
    if (address.includes('/events/')) return jsonResponse({ subject: 'Teams test', start: { dateTime: '2026-11-19T10:00:00' }, onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/valid" } });
    if (address.includes('/onlineMeetings?')) return jsonResponse({ value: [{ id: 'meeting' }] });
    if (address.endsWith('/transcripts/transcript/content')) {
      contentRequests++;
      if (options.headers.accept === 'text/vtt') return new Response(JSON.stringify({ error: { code: 'Forbidden', innerError: { code: 'SpeakerAttributionNotAllowed' } } }), { status: 403 });
      assert.equal(options.headers.accept, 'application/vnd.microsoft.graph.transcript+text'); return new Response(vtt.replace(/<v [^>]+>|<\/v>/g, ''));
    }
    if (address.endsWith('/transcripts')) return new Response(JSON.stringify({ error: { code: 'Forbidden', innerError: { code: 'GraphAccessToTranscriptsDisabled' } } }), { status: 403 });
    if (address.endsWith('/recordings')) return jsonResponse({ value: [{ id: 'recording', createdDateTime: '2026-11-19T10:20:00Z' }] });
    throw new Error(`Unexpected URL: ${address}`);
  };
  const teams = new Teams(store, env, fetcher);
  await teams.persist('alice', { accessToken: 'expired', refreshToken: 'refresh', expires: 0, scopes: ['OnlineMeetingTranscript.Read.All', 'OnlineMeetingRecording.Read.All'], account: accounts });
  const artifacts = await teams.artifacts('alice', 'event'); assert.match(artifacts.transcriptError, /désactivé/); assert.equal(artifacts.recordings.length, 1); assert.equal(refreshes, 1);
  const content = await teams.content('alice', 'event', 'transcript', 'transcript'); assert.equal(content.attributed, false); assert.equal(contentRequests, 2); assert.equal(parseTranscript(Buffer.from(await content.response.text()), '.vtt').segments[0].speaker, null);
  assert.equal((await store.get('microsoft', 'alice')).accessToken, undefined); assert.ok(!(await readFile(store.path('microsoft', 'alice'), 'utf8')).includes('rotated'));
  await assert.rejects(() => teams.request('alice', 'https://evil.test/v1.0/me'), /URL Graph/);
  assert.equal(graphError(401).code, 'MICROSOFT_RECONNECT'); assert.match(graphError(403).message, /lien Teams seul/); assert.match(graphError(404).message, /pas encore publié/);
  await teams.persist('bob', { accessToken: 'token', expires: Date.now() + 3600000, scopes: [], account: accounts });
  await assert.rejects(() => teams.content('bob', 'event', 'recording', 'recording'), /optionnel/);
  const session = { user: users[0], sessionId: 'session' }, connect = await teams.connect(session);
  const state = new URL(connect.url).searchParams.get('state'); assert.match(connect.url, /code_challenge_method=S256/); assert.ok(!new URL(connect.url).searchParams.get('scope').includes('Recording'));
  await assert.rejects(() => teams.callback({ ...session, sessionId: 'other' }, new URLSearchParams({ state, error: 'access_denied' })), /session/);
  await assert.rejects(() => teams.callback(session, new URLSearchParams({ state, error: 'access_denied' })), /refusée/);
  await assert.rejects(() => teams.callback(session, new URLSearchParams({ state, code: 'replayed' })), /expiré/);
});

test('Microsoft OAuth callback validates session/nonce and persists tokens privately; pagination is bounded to Graph', async t => {
  const root = await mkdtemp(join(tmpdir(), 'meet-oauth-')), store = new Store(root); await store.init(); t.after(() => rm(root, { recursive: true, force: true }));
  const env = { ...envFor(root), MICROSOFT_CLIENT_ID: 'client', MICROSOFT_CLIENT_SECRET: 'secret', MICROSOFT_TENANT_ID: '4e3de6cb-b1e7-457e-8766-0bd4514e5d1d' };
  let claims, tokenCalls = 0;
  const fetcher = async (url, options) => {
    if (String(url).includes('/token')) { tokenCalls++; assert.equal(options.body.get('client_secret'), 'secret'); assert.ok(options.body.get('code_verifier')); return jsonResponse({ access_token: 'access', refresh_token: 'refresh', id_token: 'verified-by-test-verifier', expires_in: 3600, scope: 'OnlineMeetingTranscript.Read.All' }); }
    if (String(url).includes('skiptoken')) return jsonResponse({ value: [{ id: 'second' }] });
    return jsonResponse({ value: [{ id: 'first' }], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/calendarView?skiptoken=next' });
  };
  const teams = new Teams(store, env, fetcher, async token => { assert.equal(token, 'verified-by-test-verifier'); return claims; }), session = { user: users[0], sessionId: 'original-session' };
  const connect = await teams.connect(session, true), state = new URL(connect.url).searchParams.get('state');
  const pending = store.open((await store.get('microsoft', `state_${digest(state)}`)).sealed);
  assert(new URL(connect.url).searchParams.get('scope').includes('OnlineMeetingRecording.Read.All'));
  claims = { nonce: pending.nonce, tid: env.MICROSOFT_TENANT_ID, oid: 'organizer', name: 'Verified organizer', preferred_username: 'organizer@example.test' };
  await teams.callback(session, new URLSearchParams({ state, code: 'code' })); assert.equal(tokenCalls, 1);
  const status = await teams.status('alice'); assert.equal(status.connected, true); assert.equal(status.account.name, 'Verified organizer'); assert.equal(status.recordings, false);
  assert.deepEqual((await teams.collection('alice', '/me/calendarView')).map(x => x.id), ['first', 'second']);
  const wrong = await teams.connect(session), wrongState = new URL(wrong.url).searchParams.get('state');
  claims = { ...claims, nonce: 'incorrect' };
  await assert.rejects(() => teams.callback(session, new URLSearchParams({ state: wrongState, code: 'code' })), /identité Microsoft/);
  await teams.disconnect('alice'); assert.equal((await teams.status('alice')).connected, false);
});
