import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
const rooms = new Map();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer((req, res) => { let path = new URL(req.url, 'http://localhost').pathname; if (path === '/healthz') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'ok', service: 'o7-meet' })); return; } if (path === '/config.json') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify({ turnUrls: process.env.TURN_URLS?.split(',').filter(Boolean) || [], turnUsername: process.env.TURN_USERNAME || '', turnCredential: process.env.TURN_PASSWORD || '' })); return; } let file = join(root, path === '/' ? 'index.html' : path); if (!existsSync(file) || !statSync(file).isFile()) file = join(root, 'index.html'); res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); createReadStream(file).pipe(res); });
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => { if (new URL(req.url, 'http://localhost').pathname !== '/ws') return socket.destroy(); wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws)); });
wss.on('connection', (ws) => { let room; let peerId; ws.on('message', (raw) => { const message = JSON.parse(raw); if (message.type === 'join') { room = rooms.get(message.roomId) || new Map(); peerId = randomUUID(); const peers = room.size; room.set(peerId, ws); rooms.set(message.roomId, room); ws.send(JSON.stringify({ type: 'joined', peerId, peers })); for (const [id, peer] of room) if (id !== peerId) peer.send(JSON.stringify({ type: 'peer-joined', peerId })); return; } if (!room) return; for (const [id, peer] of room) if (id !== peerId && peer.readyState === 1) peer.send(JSON.stringify({ ...message, from: peerId })); }); const leave = () => { if (!room || !peerId) return; room.delete(peerId); for (const peer of room.values()) if (peer.readyState === 1) peer.send(JSON.stringify({ type: 'peer-left', peerId })); if (!room.size) rooms.delete([...rooms.entries()].find(([, value]) => value === room)?.[0]); room = null; }; ws.on('close', leave); });
server.listen(process.env.PORT || 8080, '127.0.0.1', () => console.log('O7 Meet listening on 127.0.0.1:' + (process.env.PORT || 8080)));
