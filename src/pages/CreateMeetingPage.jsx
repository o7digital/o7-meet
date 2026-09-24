import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { Toast } from '../components/Feedback';
import { calendarService } from '../services/calendar';
import { useToast } from '../hooks/useToast';

const initialForm = { title: '', description: '', date: '2026-09-24', time: '10:00', duration: '45', participants: '', client: '', opportunity: '', recurrence: 'none', password: '', recording: false, transcription: true, summary: true };

export default function CreateMeetingPage({ navigation }) {
  const { navigate } = navigation;
  const [form, setForm] = useState(initialForm);
  const [created, setCreated] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const slug = useMemo(() => (form.title || 'nueva-reunion').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24), [form.title]);
  const link = `https://meet.o7digital.com/m/${slug || 'meeting'}-${Math.random().toString(36).slice(2, 7)}`;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) { toast.show('Añade un título para continuar.'); return; }
    setSaving(true);
    const response = await calendarService.schedule({ ...form, link, participants: form.participants.split(',').map((email) => email.trim()).filter(Boolean) });
    setCreated(response);
    setSaving(false);
  }

  async function copyLink() { await navigator.clipboard?.writeText(created?.link || link); toast.show('Enlace copiado.'); }

  return <section className="page-wrap narrow-page"><PageHeader eyebrow="O7 MEET" title="Crear una reunión" description="Configura una sala segura y prepara las automatizaciones de Olivia." /><form className="meeting-form card" onSubmit={submit}><div className="form-section"><div className="form-section-title"><span>01</span><div><h2>Detalles</h2><p>Información visible para los invitados.</p></div></div><div className="form-grid"><label className="full">Título<input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Ej. Revisión trimestral — Artimex" /></label><label className="full">Descripción<textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Objetivos y agenda de la reunión" /></label><label>Fecha<input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} /></label><label>Hora<input type="time" value={form.time} onChange={(e) => update('time', e.target.value)} /></label><label>Duración<select value={form.duration} onChange={(e) => update('duration', e.target.value)}><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">60 minutos</option><option value="90">90 minutos</option></select></label><label>Repetición<select value={form.recurrence} onChange={(e) => update('recurrence', e.target.value)}><option value="none">No se repite</option><option value="weekly">Cada semana</option><option value="monthly">Cada mes</option></select></label></div></div><div className="form-section"><div className="form-section-title"><span>02</span><div><h2>Invitados y contexto</h2><p>Conecta la reunión al contexto comercial.</p></div></div><div className="form-grid"><label className="full">Emails invitados<input value={form.participants} onChange={(e) => update('participants', e.target.value)} placeholder="lucia@empresa.com, charles@cliente.com" /></label><label>Cliente o empresa<input value={form.client} onChange={(e) => update('client', e.target.value)} placeholder="Artimex" /></label><label>Oportunidad Pulse CRM <span className="optional">opcional</span><input value={form.opportunity} onChange={(e) => update('opportunity', e.target.value)} placeholder="Seleccionar más adelante" /></label></div></div><div className="form-section"><div className="form-section-title"><span>03</span><div><h2>Seguridad e inteligencia</h2><p>Servicios en modo démonstration tant que les API ne sont pas connectées.</p></div></div><div className="form-grid"><label className="full">Contraseña de sala <span className="optional">opcional</span><input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Dejar vacío para acceso por enlace" /></label></div><div className="switch-list"><Toggle label="Grabación" description="Disponible cuando el proveedor de vídeo esté conectado." checked={form.recording} onChange={(value) => update('recording', value)} /><Toggle label="Transcripción Olivia" description="Generar transcripción en vivo (demo)." checked={form.transcription} onChange={(value) => update('transcription', value)} /><Toggle label="Resumen automático" description="Preparar decisiones, tareas y próximos pasos (demo)." checked={form.summary} onChange={(value) => update('summary', value)} /></div></div><div className="link-preview"><div><small>ENLACE ÚNICO</small><strong>{link}</strong></div><button type="button" className="icon-button" onClick={copyLink}><Icon name="link" /></button></div><div className="form-actions"><button type="button" className="secondary" onClick={() => navigate('/')}>Cancelar</button><button className="primary" disabled={saving}><Icon name="calendar" /> {saving ? 'Creando…' : 'Crear reunión'}</button></div></form>{created && <div className="modal-backdrop"><div className="modal success-modal"><div className="success-check"><Icon name="check" /></div><small>REUNIÓN CREADA · SIMULACIÓN LOCAL</small><h2>{created.title}</h2><p>{created.date} · {created.time} · {created.duration} min</p><div className="created-link">{created.link}</div><div className="modal-actions"><button className="secondary" onClick={copyLink}><Icon name="link" /> Copiar enlace</button><button className="primary" onClick={() => navigate(`/m/${created.id}`)}><Icon name="video" /> Entrar ahora</button></div><button className="text-button" onClick={() => navigate('/')}>Volver al dashboard</button></div></div>}<Toast message={toast.message} onClose={toast.close} /></section>;
}

function Toggle({ label, description, checked, onChange }) {
  return <label className="toggle-row"><div><strong>{label}</strong><span>{description}</span></div><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span className="toggle-ui" /></label>;
}
