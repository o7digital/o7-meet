import { useState } from 'react';
import { Icon } from '../../components/Icon';

export function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([{ id: 1, who: 'Lucía', text: 'Comparto el catálogo actualizado después de la llamada.', time: '19:58' }, { id: 2, who: 'Charles', text: 'Perfecto, gracias.', time: '19:59' }]);
  const [text, setText] = useState('');
  return <aside className="utility-panel chat-panel"><header><div><small>CONVERSACIÓN</small><h3>Chat de reunión</h3></div><button onClick={onClose}><Icon name="close" /></button></header><div className="chat-messages">{messages.map((message) => <div className={`chat-message ${message.who === 'Tú' ? 'mine' : ''}`} key={message.id}><div><b>{message.who}</b><span>{message.time}</span></div><p>{message.text}</p></div>)}</div><form className="chat-form" onSubmit={(event) => { event.preventDefault(); if (!text.trim()) return; setMessages((current) => [...current, { id: Date.now(), who: 'Tú', text, time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) }]); setText(''); }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe un mensaje…" /><button>↑</button></form></aside>;
}
