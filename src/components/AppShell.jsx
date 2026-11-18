import { Icon } from './Icon';
import { useI18n } from '../lib/i18n';
import { useSession } from '../features/documents/Session';

export function AppShell({ children, navigation, meetingMode }) {
  const { locale, setLocale, t } = useI18n();
  const { navigate, route } = navigation;
  const { session } = useSession();

  return (
    <div className={`app ${meetingMode ? 'meeting-mode' : ''}`}>
      <aside className="rail" aria-label="Navigation principale">
        <button className="o7mark" onClick={() => navigate('/')} aria-label="Accueil O7 Meet"><span>O</span><b>7</b></button>
        <button className={`railbtn ${route.name === 'home' ? 'active' : ''}`} onClick={() => navigate('/')} aria-label="Accueil"><Icon name="grid" /></button>
        <button className={`railbtn ${['meeting', 'create', 'join'].includes(route.name) ? 'active' : ''}`} onClick={() => navigate('/new')} aria-label={t('newMeeting')}><Icon name="video" /></button>
        <button className={`railbtn ${route.name === 'meetings' ? 'active' : ''}`} onClick={() => navigate('/meetings')} aria-label={t('meetings')}><Icon name="calendar" /></button>
        <div className="railspacer" />
        <button className="railbtn" onClick={() => navigate('/import')} aria-label="Importer dans Olivia"><Icon name="download" /></button>
        <div className="avatar tiny" title={session?.user.name || 'Non connecté'}>{session?.user.name.split(' ').map(s => s[0]).slice(0, 2).join('') || '—'}</div>
      </aside>
      <main className="main">
        {!meetingMode && (
          <header className="topbar">
            <button className="brand" onClick={() => navigate('/')}><span className="dot" /> O7 <b>Meet</b><span className="pill">{t('poweredBy')}</span></button>
            <div className="topactions">
              <button className="secondary" onClick={() => navigate('/import')}>Importer</button>
              <select className="language" value={locale} onChange={(event) => setLocale(event.target.value)} aria-label="Language">
                <option value="es">ES</option><option value="en">EN</option><option value="fr">FR</option>
              </select>
              <button className="ghost desktop-only" onClick={() => navigate('/meetings')}>{t('calendar')}</button>
              <button className="primary" onClick={() => navigate('/new')}><Icon name="video" /> <span>{t('newMeeting')}</span></button>
            </div>
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
