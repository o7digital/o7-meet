import { useMemo, useState } from 'react';
import { EmptyState } from '../components/Feedback';
import { Icon } from '../components/Icon';
import { MeetingList } from '../components/MeetingList';
import { PageHeader } from '../components/PageHeader';
import { meetings } from '../features/meetings/data';

export default function MeetingsPage({ navigation }) {
  const { navigate } = navigation;
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('all');
  const [status, setStatus] = useState('all');
  const [client, setClient] = useState('all');
  const clients = [...new Set(meetings.map((meeting) => meeting.client))];
  const filtered = useMemo(() => meetings.filter((meeting) => {
    const matchesQuery = `${meeting.title} ${meeting.client} ${meeting.participants.map((person) => person.name).join(' ')}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'all' || meeting.status === status;
    const matchesClient = client === 'all' || meeting.client === client;
    const matchesPeriod = period === 'all' || (period === 'today' && meeting.date === '2026-09-23') || (period === 'week' && meeting.date >= '2026-09-18') || period === 'month';
    return matchesQuery && matchesStatus && matchesClient && matchesPeriod;
  }), [query, period, status, client]);
  const open = (meeting) => navigate(meeting.status === 'completed' ? `/summary/${meeting.id}` : `/m/${meeting.id}`);

  return <section className="page-wrap"><PageHeader eyebrow="HISTORIAL" title="Mis reuniones" description="Encuentra reuniones, participantes y resúmenes de Olivia." actions={<button className="primary" onClick={() => navigate('/new')}><Icon name="video" /> Nueva reunión</button>} /><div className="history-toolbar"><div className="search-bar"><Icon name="search" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por título, cliente o participante" /></div><select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="all">Todas las fechas</option><option value="today">Hoy</option><option value="week">Esta semana</option><option value="month">Este mes</option></select><select value={client} onChange={(e) => setClient(e.target.value)}><option value="all">Todos los clientes</option>{clients.map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Todos los estados</option><option value="scheduled">Programadas</option><option value="completed">Completadas</option></select></div><div className="result-count">{filtered.length} reuniones</div><article className="card history-list">{filtered.length ? <MeetingList meetings={filtered} onOpen={open} /> : <EmptyState title="Sin resultados" description="Prueba con otros filtros o crea una nueva reunión." action={<button className="secondary" onClick={() => { setQuery(''); setPeriod('all'); setClient('all'); setStatus('all'); }}>Limpiar filtros</button>} />}</article></section>;
}
