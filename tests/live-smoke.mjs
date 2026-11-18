// Explicit live-provider check. Credentials arrive through stdin, never CLI arguments or output.
import assert from 'node:assert/strict';
import { createInterface } from 'node:readline';
import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createApplication } from '../server/app.mjs';
const input = createInterface({ input: process.stdin });
const config = JSON.parse(await new Promise(resolve => input.once('line', resolve))); input.close();
let app, localRoot, base = config.base, session = { cookie: config.cookie, csrf: config.csrf }; const created = [];
if (!base) {
  assert(config.openaiKey); localRoot = await mkdtemp(join(tmpdir(), 'meet-real-'));
  app = await createApplication({ env: { APP_ORIGIN: 'http://127.0.0.1', MEET_DATA_DIR: localRoot, OPENAI_API_KEY: config.openaiKey, OLIVIA_MEET_MODEL: 'gpt-4o', MEET_IDENTITIES_JSON: JSON.stringify([{ id: 'qa-owner', name: 'QA test owner', email: 'qa@example.test' }]) }, authenticate: async () => {} });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${app.server.address().port}`;
  const login = await fetch(`${base}/api/olivia/login`, { method: 'POST', headers: { origin: 'http://127.0.0.1' }, body: JSON.stringify({ email: 'qa@example.test', password: 'test-only' }) }); assert.equal(login.status, 200);
  session = { cookie: login.headers.get('set-cookie').split(';')[0], csrf: (await login.json()).csrf };
}
const origin = app ? 'http://127.0.0.1' : new URL(base).origin;
async function request(path, { method = 'GET', body, raw = false, anonymous = false } = {}) {
  return fetch(`${base}/api/olivia${path}`, { method, headers: { origin, ...(!anonymous ? { cookie: session.cookie, 'x-meet-csrf': session.csrf } : {}), ...(!raw && body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: raw ? body : JSON.stringify(body) } : {}) });
}
async function expectJson(path, options) { const response = await request(path, options), data = await response.json(); assert(response.ok, `${response.status}: ${JSON.stringify(data)}`); return data; }
async function processFile({ title, filename, body, language = 'fr' }) {
  const params = new URLSearchParams({ title, filename, originalLanguage: language, targetLanguage: 'en', meetingDate: '2026-11-19' });
  const imported = await expectJson(`/meetings?${params}`, { method: 'POST', body, raw: true }); created.push(imported.meeting.id);
  const id = imported.meeting.id; await expectJson(`/meetings/${id}/process`, { method: 'POST', body: {} });
  let meeting, previous;
  for (let i = 0; i < 240; i++) {
    meeting = (await expectJson(`/meetings/${id}`)).meeting;
    if (meeting.status !== previous) { console.log(JSON.stringify({ event: 'live.stage', input: filename, stage: meeting.status })); previous = meeting.status; }
    if (meeting.status === 'complete' || meeting.status === 'error') break;
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  assert.equal(meeting.status, 'complete', meeting.error || 'Live processing timeout');
  assert.ok(meeting.original.segments.length); assert.equal(meeting.translation.segments.length, meeting.original.segments.length);
  assert.ok(meeting.summary.trim()); assert.ok(meeting.report.topics.length); assert.equal(meeting.simulated, undefined);
  for (let i = 0; i < meeting.original.segments.length; i++) { assert.equal(meeting.translation.segments[i].start, meeting.original.segments[i].start); assert.equal(meeting.translation.segments[i].speaker, meeting.original.segments[i].speaker); }
  for (const kind of ['all', 'original', 'translation', 'report', 'summary']) for (const format of ['docx', 'txt']) {
    const response = await request(`/meetings/${id}/export?kind=${kind}&format=${format}`); assert.equal(response.status, 200);
    const buffer = Buffer.from(await response.arrayBuffer()); assert(buffer.length > 100);
    const target = join(config.artifactDir, `${filename.replace(/\.[^.]+$/, '')}-${kind}.${format}`); await writeFile(target, buffer);
    if (format === 'docx') { assert.equal(buffer.subarray(0, 2).toString(), 'PK'); assert.match(execFileSync('unzip', ['-p', target, 'word/document.xml'], { encoding: 'utf8' }), /w:document/); }
    else { assert.equal(buffer.subarray(0, 3).toString('hex'), 'efbbbf'); assert.match(buffer.toString('utf8'), /Date de réunion : 2026-11-19/); }
    assert.equal((await request(`/meetings/${id}/export?kind=${kind}&format=${format}`, { anonymous: true })).status, 401);
  }
  const duplicate = await expectJson(`/meetings?${params}`, { method: 'POST', body, raw: true }); assert.equal(duplicate.duplicate, true); assert.equal(duplicate.meeting.id, id);
  await writeFile(join(config.artifactDir, `${filename}.result.json`), JSON.stringify(meeting, null, 2));
  return meeting;
}
try {
  await mkdir(config.artifactDir, { recursive: true });
  const audio = await processFile({ title: 'Validation audio synthétique — 19 novembre', filename: 'validation-audio.wav', body: await readFile(config.audioPath) });
  assert(audio.original.segments.every(s => s.speaker === null)); assert.equal(audio.original.engine, 'whisper-1');
  assert.match(audio.original.segments.map(s => s.text).join(' '), /devis/i);
  const vtt = `WEBVTT\n\n1\n00:00:01.125 --> 00:00:04.500\n<v Olivier>Cette réunion concerne le devis du site.</v>\n\n2\n00:00:05.000 --> 00:00:10.250\n<v Laetitia>Nous décidons de valider le devis. Olivier enverra le document vendredi.</v>\n`;
  const transcript = await processFile({ title: 'Validation VTT synthétique — 19 novembre', filename: 'validation-teams.vtt', body: Buffer.from(vtt) });
  assert.match(transcript.report.topics.join(' '), /quote|quotation|estimate/i); assert.equal(transcript.report.actions[0]?.owner, 'Olivier'); assert.equal(transcript.report.actions[0]?.deadline, 'vendredi');
  assert.equal(transcript.original.segments[1].speaker, 'Laetitia'); assert.equal(transcript.translation.segments[0].start, 1.125);
  if (config.videoPath) { const video = await processFile({ title: 'Validation extraction vidéo synthétique', filename: 'validation-video.mp4', body: await readFile(config.videoPath) }); assert.equal(video.original.engine, 'whisper-1'); assert(video.original.segments.every(s => s.speaker === null)); }
  const teams = await expectJson('/teams/status');
  console.log(JSON.stringify({ status: 'passed', base, audioEngine: audio.original.engine, generationModel: audio.translation.engine, audioSegments: audio.original.segments.length, vttSpeakers: transcript.original.segments.map(s => s.speaker), exportFilesVerified: config.videoPath ? 30 : 20, anonymousExports: 'denied', duplicateImports: 'prevented', microsoft: { configured: teams.configured, missing: teams.missing }, artifactDir: config.artifactDir }));
} finally {
  if (!config.keepDocuments) for (const id of new Set(created)) await request(`/meetings/${id}`, { method: 'DELETE' }).catch(() => {});
  if (app) { await app.pipeline.tail; await new Promise(resolve => app.server.close(resolve)); await rm(localRoot, { recursive: true, force: true }); }
}
