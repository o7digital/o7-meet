import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { oliviaService } from '../../services/olivia';
import { tasks, transcript } from '../meetings/data';

const tabs = ['notes', 'transcript', 'summary', 'tasks', 'ask'];

export function OliviaPanel({ onClose }) {
  const [tab, setTab] = useState('notes');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  async function askOlivia(event) {
    event.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    const response = await oliviaService.ask(question);
    setAnswer(response.answer);
    setLoading(false);
  }

  return <aside className="ai-panel">
    <div className="ai-head"><div className="olivia-orb small">O</div><div><b>Olivia</b><span>Meeting Copilot · Demo</span></div><button onClick={onClose} aria-label="Cerrar Olivia"><Icon name="close" /></button></div>
    <div className="tabs" role="tablist">{tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{({ notes: 'Live Notes', transcript: 'Transcript', summary: 'Summary', tasks: 'Tasks', ask: 'Ask' })[item]}</button>)}</div>
    <div className="ai-content">
      {(tab === 'notes' || tab === 'transcript') && <div className="transcript">{transcript.map((note) => <div className={`note ${note.ai ? 'ai' : ''}`} key={`${note.time}-${note.who}`}><span>{note.time}</span><div><b>{note.who}</b><p>{note.text}</p></div></div>)}</div>}
      {tab === 'summary' && <div className="panel-section"><span className="mock-badge">SIMULATED AI</span><h3>Resumen en vivo</h3><p>El equipo prioriza el flujo e-commerce, el catálogo backend y la preparación de la integración R365.</p><h4>Decisiones</h4><ul><li>Priorizar pedidos online.</li><li>Usar el catálogo backend como fuente de verdad.</li></ul><h4>Compromisos</h4><ul><li>Preparar el alcance técnico.</li><li>Validar el catálogo antes del viernes.</li></ul></div>}
      {tab === 'tasks' && <div className="panel-section"><span className="mock-badge">SIMULATED AI</span>{tasks.map((task) => <div className="panel-task" key={task.id}><strong>{task.title}</strong><span>{task.owner} · {task.deadline}</span><em>{task.priority}</em></div>)}</div>}
      {tab === 'ask' && <div className="panel-section ask-section"><span className="mock-badge">SIMULATED AI</span><h3>Ask Olivia</h3><p>Pregunta sobre decisiones, tareas o próximos pasos de esta reunión.</p>{['Resume esta reunión', '¿Qué decidió el cliente?', '¿Cuáles son mis acciones?'].map((suggestion) => <button className="question-chip" key={suggestion} onClick={() => setQuestion(suggestion)}>{suggestion}</button>)}{answer && <div className="olivia-answer"><b>Olivia</b><p>{answer}</p></div>}<form className="askbox" onSubmit={askOlivia}><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask Olivia…" /><button disabled={loading}>{loading ? '…' : '↑'}</button></form></div>}
    </div>
    {tab !== 'ask' && <div className="insight"><Icon name="spark" /><div><b>2 decisions · 3 tasks</b><span>Resumen generado con datos de demostración.</span></div></div>}
  </aside>;
}
