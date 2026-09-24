import { Icon } from './Icon';
import { useI18n } from '../lib/i18n';

export function AppShell({ children, navigation, meetingMode }) {
  const { locale, setLocale, t } = useI18n();
  const { navigate, route } = navigation;

  return (
    <div className={`app ${meetingMode ? 'meeting-mode' : ''}`}>
      <aside className="rail" aria-label="Navigation principale">
        <button className="o7mark" onClick={() => navigate('/')} aria-label="Accueil O7 Meet">O7</button>
        <button className={`railbtn ${route.name === 'home' ? 'active' : ''}`} onClick={() => navigate('/')} aria-label="Accueil"><Icon name="grid" /></button>
        <button className={`railbtn ${['meeting', 'create', 'join'].includes(route.name) ? 'active' : ''}`} onClick={() => navigate('/new')} aria-label={t('newMeeting')}><Icon name="video" /></button>
        <button className={`railbtn ${route.name === 'meetings' ? 'active' : ''}`} onClick={() => navigate('/meetings')} aria-label={t('meetings')}><Icon name="calendar" /></button>
        <div className="railspacer" />
        <div className="avatar tiny" title="Olivier Steineur">OS</div>
      </aside>
      <main className="main">
        {!meetingMode && (
          <header className="topbar">
            <button className="brand" onClick={() => navigate('/')}><span className="dot" /> O7 <b>Meet</b><span className="pill">{t('poweredBy')}</span></button>
            <div className="topactions">
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
