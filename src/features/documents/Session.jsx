import { createContext, useContext, useEffect, useState } from 'react';
import { api, setCsrf } from '../../services/olivia';
const Context = createContext(null);
export const useSession = () => useContext(Context);
export function SessionProvider({ children }) {
  const [session, setSession] = useState(null), [loading, setLoading] = useState(true), [failure, setFailure] = useState('');
  async function reload() {
    try { const result = await api('/session'); setCsrf(result.csrf); setSession(result); setFailure(''); }
    catch (e) { setSession(null); setCsrf(''); if (e.status !== 401) setFailure(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); const expired = () => { setSession(null); setCsrf(''); }; window.addEventListener('meet-session-expired', expired); return () => window.removeEventListener('meet-session-expired', expired); }, []);
  async function login(email, password) { const result = await api('/login', { method: 'POST', body: { email, password } }); setCsrf(result.csrf); await reload(); }
  async function logout() { await api('/logout', { method: 'POST' }); setCsrf(''); setSession(null); }
  return <Context.Provider value={{ session, loading, failure, login, logout, reload }}>{children}</Context.Provider>;
}
export function SessionGate({ children }) {
  const { session, loading, failure, login, reload } = useSession();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  if (loading) return <section className="page-wrap"><p role="status">Vérification de votre connexion…</p></section>;
  if (session) return children;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget);
    try { await login(form.get('email'), form.get('password')); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="page-wrap meet-documents"><div className="import-intro"><small>OLIVIA ONE MEET · ESPACE PRIVÉ</small><h1>Vos réunions,<br /><span>des documents utiles.</span></h1><p>Importez une transcription ou un enregistrement. Retrouvez l’original, sa traduction, le compte rendu et un résumé, puis exportez-les en Word ou en texte.</p></div><form className="card login-card" onSubmit={submit}><h2>Se connecter</h2><p className="muted">Utilisez votre compte de messagerie Olivia One autorisé. Les documents restent privés jusqu’au choix des destinataires.</p><label>Adresse de messagerie<input name="email" type="email" autoComplete="username" required /></label><label>Mot de passe de messagerie<input name="password" type="password" autoComplete="current-password" required maxLength={1024} /></label>{(error || failure) && <p className="document-error" role="alert">{error || failure}</p>}<button className="primary" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter à Meet'}</button>{failure && <button type="button" className="secondary" onClick={reload}>Réessayer</button>}<p className="privacy-note">Les contenus sont traités par le fournisseur IA déjà configuré dans Olivia. Aucun courriel n’est envoyé automatiquement.</p></form></section>;
}
