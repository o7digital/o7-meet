import { mkdir, readFile, writeFile, rename, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

export class ApiError extends Error {
  constructor(status, message, code = 'REQUEST_FAILED') { super(message); this.status = status; this.code = code; }
}
export const digest = value => createHash('sha256').update(value).digest('hex');
export const validId = id => /^[a-f0-9-]{36}$/.test(id);

export class Store {
  constructor(root) { this.root = root; this.locks = new Map(); }
  async init() {
    for (const dir of ['', 'meetings', 'sources', 'sessions', 'microsoft', 'scratch']) await mkdir(join(this.root, dir), { recursive: true, mode: 0o700 });
    const path = join(this.root, '.encryption-key');
    try { this.key = await readFile(path); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await writeFile(path, randomBytes(32), { mode: 0o600, flag: 'wx' }); this.key = await readFile(path);
    }
  }
  path(collection, id) {
    if (!/^[a-z]+$/.test(collection) || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new ApiError(400, 'Identifiant invalide.');
    return join(this.root, collection, `${id}.json`);
  }
  async get(collection, id) {
    try { return JSON.parse(await readFile(this.path(collection, id), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async put(collection, id, value) {
    const target = this.path(collection, id), temp = `${target}.${randomBytes(8).toString('hex')}.tmp`;
    await writeFile(temp, JSON.stringify(value), { mode: 0o600 }); await rename(temp, target);
  }
  async delete(collection, id) { await unlink(this.path(collection, id)).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
  async update(collection, id, change) {
    const key = `${collection}:${id}`, previous = this.locks.get(key) || Promise.resolve();
    const next = previous.catch(() => {}).then(async () => { const value = await change(await this.get(collection, id)); await this.put(collection, id, value); return value; });
    this.locks.set(key, next);
    try { return await next; } finally { if (this.locks.get(key) === next) this.locks.delete(key); }
  }
  async list(collection) {
    const files = (await readdir(join(this.root, collection))).filter(f => f.endsWith('.json'));
    return (await Promise.all(files.map(f => this.get(collection, f.slice(0, -5))))).filter(Boolean);
  }
  seal(value) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
  }
  open(value) {
    const data = Buffer.from(value, 'base64'), cipher = createDecipheriv('aes-256-gcm', this.key, data.subarray(0, 12));
    cipher.setAuthTag(data.subarray(12, 28));
    return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString('utf8'));
  }
}

export function authorize(meeting, user, ownerOnly = false) {
  if (!meeting || (meeting.ownerId !== user.id && (ownerOnly || !meeting.recipientIds.includes(user.id)))) {
    throw new ApiError(404, 'Document introuvable ou accès non autorisé.', 'NOT_FOUND');
  }
  return meeting;
}
