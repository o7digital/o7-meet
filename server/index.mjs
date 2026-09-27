import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { AccessToken } from 'livekit-server-sdk';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const config = () => ({ livekitUrl: process.env.LIVEKIT_URL || '', turnUrls: process.env.TURN_URLS?.split(',').filter(Boolean) || [], turnUsername: process.env.TURN_USERNAME || '', turnCredential: process.env.TURN_PASSWORD || '' });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/healthz') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'ok', service: 'o7-meet', media: Boolean(process.env.LIVEKIT_URL) })); return; }
  if (url.pathname === '/config.json') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(config())); return; }
  if (url.pathname === '/token') { const room = url.searchParams.get('room'); const identity = (url.searchParams.get('identity') || '').slice(0, 100); if (!room || !identity || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) { res.writeHead(400, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'room, identity and LiveKit server configuration are required' })); return; } const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity, name: identity }); token.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, roomCreate: true }); res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify({ token: await token.toJwt(), url: process.env.LIVEKIT_URL || '' })); return; }
  let file = join(root, url.pathname === '/' ? 'index.html' : url.pathname); if (!existsSync(file) || !statSync(file).isFile()) file = join(root, 'index.html'); res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); createReadStream(file).pipe(res);
});
server.listen(process.env.PORT || 8080, '0.0.0.0', () => console.log('O7 Meet listening on :' + (process.env.PORT || 8080)));
