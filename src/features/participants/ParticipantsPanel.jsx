import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { participants } from '../meetings/data';

export function ParticipantsPanel({ onClose, onInvite }) {
  const [email, setEmail] = useState('');
  return <aside className="utility-panel"><header><div><small>EN LA SALA</small><h3>Participantes <span>{participants.filter((p) => p.connected).length}</span></h3></div><button onClick={onClose}><Icon name="close" /></button></header><div className="participant-list">{participants.map((person) => <div className={`participant-row ${!person.connected ? 'disconnected' : ''}`} key={person.id}><div className="avatar">{person.initials}</div><div><b>{person.name} {person.isSelf && <small>(Tú)</small>}</b><span>{person.connected ? person.role : 'Desconectado'}</span></div><Icon name={person.connected ? 'mic' : 'micOff'} size={16} /></div>)}</div><form className="invite-form" onSubmit={(event) => { event.preventDefault(); if (email) { onInvite(email); setEmail(''); } }}><label>Invitar por email</label><div><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@empresa.com" /><button><Icon name="userPlus" /></button></div></form></aside>;
}
