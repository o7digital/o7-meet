import { Icon } from './Icon';

export function MeetingList({ meetings, onOpen, compact = false }) {
  return <div className={`meeting-list ${compact ? 'compact' : ''}`}>{meetings.map((meeting) => <article className="meeting-list-row" key={meeting.id}><div className="meeting-date"><strong>{meeting.time}</strong><span>{meeting.dateLabel}</span></div><div className="meeting-list-icon"><Icon name="video" /></div><div className="meeting-list-main"><strong>{meeting.title}</strong><span>{meeting.client} · {meeting.duration} min · {meeting.participants.length} participantes</span></div><span className={`status status-${meeting.status}`}>{meeting.statusLabel}</span>{meeting.hasSummary && <span className="aiTag"><Icon name="spark" size={14} /> Resumen listo</span>}<button className="round" onClick={() => onOpen(meeting)} aria-label={`Abrir ${meeting.title}`}><Icon name="more" /></button></article>)}</div>;
}
