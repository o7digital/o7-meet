import { randomBytes, timingSafeEqual } from 'node:crypto';
import { ImapFlow } from 'imapflow';
import { ApiError, digest } from './store.mjs';

export function directory(env) {
  const users = JSON.parse(env.MEET_IDENTITIES_JSON || '[]');
  if (!Array.isArray(users) || users.some(u => !u.id || !u.email || !u.name)) throw new Error('Invalid MEET_IDENTITIES_JSON');
  return users;
}
const cookieName = '__Host-meet_session';
export function sessionToken(req, secure = true) {
  const name = secure ? cookieName : 'meet_session';
  const value = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  return value?.slice(name.length + 1) || '';
}
export function constantEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export class Identity {
  constructor(store, env, authenticate) { this.store = store; this.env = env; this.users = directory(env); this.authenticate = authenticate || this.mailbox.bind(this); this.attempts = new Map(); this.secure = env.APP_ORIGIN?.startsWith('https://'); }
  async mailbox(email, password) {
    if (!this.env.MAIL_IMAP_HOST) throw new ApiError(503, 'Authentification non configurée : MAIL_IMAP_HOST manque.', 'AUTH_NOT_CONFIGURED');
    const imap = new ImapFlow({ host: this.env.MAIL_IMAP_HOST, port: Number(this.env.MAIL_IMAP_PORT || 993), secure: true, auth: { user: email, pass: password }, logger: false, connectionTimeout: 12000, greetingTimeout: 12000, socketTimeout: 15000, tls: { rejectUnauthorized: true } });
    imap.on('error', () => {});
    try { await imap.connect(); } catch { throw new ApiError(401, 'Identifiants de messagerie incorrects ou service de connexion indisponible.', 'LOGIN_FAILED'); }
    finally { await imap.logout().catch(() => {}); }
  }
  async login(req, res, body) {
    // Per-address and per-IP limits also cover nonexistent accounts. Never trust forwarded IP headers.
    const email = String(body.email || '').trim().toLowerCase(), ip = req.socket.remoteAddress;
    const keys = [`mail:${email}`, `ip:${ip}`], now = Date.now();
    for (const key of keys) { const old = this.attempts.get(key); const item = old && old.until > now ? old : { count: 0, until: now + 900000 }; item.count++; this.attempts.set(key, item); if (item.count > (key.startsWith('ip:') ? 40 : 8)) throw new ApiError(429, 'Trop de tentatives. Réessayez dans 15 minutes.'); }
    for (const [key, item] of this.attempts) if (item.until < now) this.attempts.delete(key);
    if (!this.users.length) throw new ApiError(503, 'Aucune identité vérifiée configurée dans Meet.', 'AUTH_NOT_CONFIGURED');
    const user = this.users.find(u => u.email.toLowerCase() === email);
    if (!user || typeof body.password !== 'string' || !body.password || body.password.length > 1024) throw new ApiError(401, 'Identifiants incorrects ou compte non autorisé.', 'LOGIN_FAILED');
    await this.authenticate(email, body.password);
    for (const key of keys) this.attempts.delete(key);
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
    const session = { userId: user.id, csrf, expires: now + 8 * 3600000 };
    await this.store.put('sessions', digest(token), session);
    res.setHeader('set-cookie', `${this.secure ? cookieName : 'meet_session'}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${this.secure ? '; Secure' : ''}`);
    return { user, csrf };
  }
  async require(req) {
    const token = sessionToken(req, this.secure);
    const session = token && /^[a-f0-9]{64}$/.test(token) ? await this.store.get('sessions', digest(token)) : null;
    const user = session && this.users.find(u => u.id === session.userId);
    if (!session || !user || session.expires < Date.now()) throw new ApiError(401, 'Connectez-vous à votre compte Meet.', 'AUTH_REQUIRED');
    return { ...session, user, sessionId: digest(token) };
  }
  csrf(req, session) { if (!constantEqual(req.headers['x-meet-csrf'], session.csrf)) throw new ApiError(403, 'Session de formulaire expirée. Rechargez la page.', 'INVALID_CSRF'); }
  origin(req) {
    if (req.headers.origin !== this.env.APP_ORIGIN) throw new ApiError(403, 'Origine de la requête non autorisée.', 'INVALID_ORIGIN');
  }
  async logout(req, res, session) { await this.store.delete('sessions', session.sessionId); res.setHeader('set-cookie', `${this.secure ? cookieName : 'meet_session'}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${this.secure ? '; Secure' : ''}`); return { ok: true }; }
}
