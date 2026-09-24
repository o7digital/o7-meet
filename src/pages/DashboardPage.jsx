import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { MeetingList } from '../components/MeetingList';
import { meetings } from '../features/meetings/data';
import { useI18n } from '../lib/i18n';

export default function DashboardPage({ navigation }) {
  const { navigate } = navigation;
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => meetings.filter((meeting) => `${meeting.title} ${meeting.client} ${meeting.participants.map((person) => person.name).join(' ')}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const upcoming = filtered.filter((meeting) => meeting.status === 'scheduled');
  const recent = filtered.filter((meeting) => meeting.status === 'completed');
  const openMeeting = (meeting) => navigate(meeting.status === 'completed' ? `/summary/${meeting.id}` : `/m/${meeting.id}`);

  return <section className="dashboard page-wrap">
    <div className="search-bar"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search')} /></div>
    <div className="home-grid">
      <article className="hero-card glass"><div className="eyebrow">SMART COLLABORATION</div><h1>Meetings that<br /><span>turn into action.</span></h1><p>Videoconferencia empresarial con Olivia integrada para transcribir, resumir, detectar decisiones y preparar acciones para Pulse CRM.</p><div className="hero-actions"><button className="primary big" onClick={() => navigate('/new')}><Icon name="video" /> {t('newMeeting')}</button><button className="secondary" onClick={() => navigate('/join')}>{t('joinMeeting')}</button><button className="ghost bordered" onClick={() => navigate('/new?mode=schedule')}><Icon name="calendar" /> {t('schedule')}</button></div></article>
      <div className="sidecol"><article className="card upcoming-card"><div className="card-head"><div><small>HOY</small><h2>{t('upcoming')}</h2></div><span>23 SEP</span></div>{upcoming.map((meeting) => <div className="upcoming-row" key={meeting.id}><div className="time">{meeting.time}</div><div><b>{meeting.title}</b><span>{meeting.client} · {meeting.participants.length} participantes</span></div><button onClick={() => openMeeting(meeting)}>{t('enter')}</button></div>)}</article><article className="card olivia-card"><div className="olivia-orb">O</div><div><small>OLIVIA</small><h2>{t('meetingIntelligence')}</h2><p>Notas, decisiones, tareas y seguimiento CRM sin salir de la llamada.</p></div></article></div>
    </div>
    <article className="card recent-card"><div className="section-title"><div><small>ACTIVIDAD</small><h2>{query ? `Resultados (${filtered.length})` : t('recent')}</h2></div><button onClick={() => navigate('/meetings')}>{t('seeAll')} →</button></div>{recent.length ? <MeetingList meetings={recent} onOpen={openMeeting} compact /> : <p className="muted empty-inline">No hay reuniones que coincidan con la búsqueda.</p>}</article>
  </section>;
}
