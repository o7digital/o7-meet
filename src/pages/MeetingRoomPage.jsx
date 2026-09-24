import { useEffect, useState } from 'react';
import { ConfirmDialog, Toast } from '../components/Feedback';
import { Icon } from '../components/Icon';
import { ChatPanel } from '../features/meetings/ChatPanel';
import { activeMeeting, participants } from '../features/meetings/data';
import { OliviaPanel } from '../features/olivia/OliviaPanel';
import { ParticipantsPanel } from '../features/participants/ParticipantsPanel';
import { getVideoProvider } from '../features/video/provider';
import { useMeetingControls } from '../hooks/useMeetingControls';
import { useToast } from '../hooks/useToast';

export default function MeetingRoomPage({ navigation, params }) {
  const { navigate } = navigation;
  const controls = useMeetingControls(params.id);
  const [olivia, setOlivia] = useState(true);
  const [panel, setPanel] = useState('');
  const [layout, setLayout] = useState('speaker');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [devices, setDevices] = useState({ microphones: [], cameras: [], speakers: [] });
  const [elapsed, setElapsed] = useState(2538);
  const toast = useToast();
  const sideOpen = olivia || panel;

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    getVideoProvider().listDevices().then(setDevices);
    return () => window.clearInterval(timer);
  }, []);

  const time = new Date(elapsed * 1000).toISOString().slice(11, 19);
  const togglePanel = (next) => { setOlivia(false); setPanel((current) => current === next ? '' : next); };
  async function copyLink() { await navigator.clipboard?.writeText(activeMeeting.link); toast.show('Enlace de reunión copiado.'); }
  async function toggleFullscreen() { if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.(); else await document.exitFullscreen?.(); }
  function finishMeeting() { setLeaveOpen(false); navigate(`/summary/${params.id}`); }

  return <section className="meeting-stage">
    <header className="meeting-header"><button className="meeting-brand" onClick={() => setLeaveOpen(true)}><span><i>O</i><b>7</b></span> Meet</button><div><small>O7 MEET · <span className="live-dot" /> LIVE</small><h1>{activeMeeting.title}</h1></div><div className="meeting-meta"><span>{controls.status === 'connecting' ? 'Conectando…' : time}</span><span>·</span><span>{participants.filter((person) => person.connected).length} participantes</span><button onClick={copyLink} title="Copiar enlace"><Icon name="link" /></button><button onClick={toggleFullscreen} title="Pantalla completa"><Icon name="fullscreen" /></button><button onClick={() => setSettingsOpen(true)} title="Ajustes"><Icon name="settings" /></button></div></header>
    {controls.error && <div className="connection-alert">{controls.error} <button onClick={() => window.location.reload()}>Reintentar</button></div>}
    <div className={`meeting-grid ${sideOpen ? 'with-panel' : ''}`}>
      <VideoArea layout={layout} screenSharing={controls.screen} camera={controls.camera} />
      {olivia && <OliviaPanel onClose={() => setOlivia(false)} />}
      {panel === 'participants' && <ParticipantsPanel onClose={() => setPanel('')} onInvite={(email) => toast.show(`Invitación simulada para ${email}`)} />}
      {panel === 'chat' && <ChatPanel onClose={() => setPanel('')} />}
    </div>
    <div className="meeting-footer"><div className="layout-switch"><button className={layout === 'speaker' ? 'active' : ''} onClick={() => setLayout('speaker')}>Speaker</button><button className={layout === 'gallery' ? 'active' : ''} onClick={() => setLayout('gallery')}>Gallery</button><button className={layout === 'focus' ? 'active' : ''} onClick={() => setLayout('focus')}>Focus</button></div><div className="controls"><ControlButton active={controls.mic} dangerWhenInactive icon={controls.mic ? 'mic' : 'micOff'} label="Micrófono" onClick={() => controls.toggle('mic')} /><ControlButton active={controls.camera} dangerWhenInactive icon={controls.camera ? 'video' : 'videoOff'} label="Cámara" onClick={() => controls.toggle('camera')} /><ControlButton active={controls.screen} showActive icon="screen" label="Compartir" onClick={() => controls.toggle('screen')} /><ControlButton active={panel === 'chat'} showActive icon="chat" label="Chat" onClick={() => togglePanel('chat')} /><ControlButton active={panel === 'participants'} showActive icon="people" label="Personas" onClick={() => togglePanel('participants')} /><button className={`ai-control ${olivia ? 'active' : ''}`} onClick={() => { setPanel(''); setOlivia(!olivia); }}><Icon name="spark" /><span>Olivia</span></button><button className="hang" onClick={() => setLeaveOpen(true)}><Icon name="phone" /><span>Salir</span></button></div><button className="invite-shortcut" onClick={() => togglePanel('participants')}><Icon name="userPlus" /> Invitar</button></div>
    <ConfirmDialog open={leaveOpen} title="¿Salir de la reunión?" confirmLabel="Terminar para todos" secondaryLabel="Salir de la reunión" onClose={() => setLeaveOpen(false)} onSecondary={finishMeeting} onConfirm={finishMeeting}><p>Si terminas la reunión, todos los participantes serán desconectados y Olivia preparará el resumen.</p></ConfirmDialog>
    {settingsOpen && <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}><div className="modal settings-modal" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setSettingsOpen(false)}><Icon name="close" /></button><small>DISPOSITIVOS</small><h2>Ajustes de audio y vídeo</h2><DeviceSelect label="Micrófono" items={devices.microphones} /><DeviceSelect label="Cámara" items={devices.cameras} /><DeviceSelect label="Altavoz" items={devices.speakers} /><p className="mock-note">Dispositivos simulados. La sélection réelle sera activée avec le fournisseur WebRTC.</p><button className="primary full-button" onClick={() => setSettingsOpen(false)}>Guardar preferencias</button></div></div>}
    <Toast message={toast.message} onClose={toast.close} />
  </section>;
}

function VideoArea({ layout, screenSharing, camera }) {
  const visible = participants.filter((person) => person.connected);
  if (screenSharing) return <div className="video-area screen-layout"><div className="shared-screen"><span className="mock-badge">SCREEN SHARE · DEMO</span><div className="screen-document"><div className="screen-doc-head" /><div className="screen-doc-title" /><div className="screen-doc-grid"><i /><i /><i /></div></div><span>Olivier está compartiendo su pantalla</span></div><div className="floating-participants">{visible.slice(0, 3).map((person, index) => <PersonTile key={person.id} person={person} index={index} camera={camera} />)}</div></div>;
  return <div className={`video-area layout-${layout}`}>{visible.map((person, index) => <PersonTile key={person.id} person={person} index={index} camera={person.isSelf ? camera : true} speaker={index === 0} />)}</div>;
}

function PersonTile({ person, index, camera, speaker }) {
  return <div className={`person-tile portrait-${index + 1} ${speaker ? 'speaking' : ''} ${!camera ? 'camera-off' : ''}`}><div className="portrait"><span>{person.initials}</span></div><div className="nameplate">{person.name} {person.isSelf && <small>YOU</small>}{speaker && <span>Speaking</span>}</div>{speaker && <div className="speaking-bars"><i /><i /><i /></div>}</div>;
}

function ControlButton({ active, dangerWhenInactive = false, showActive = false, icon, label, onClick }) {
  const className = dangerWhenInactive && !active ? 'control-off' : showActive && active ? 'control-active' : '';
  return <button className={className} onClick={onClick} title={label}><Icon name={icon} /><span>{label}</span></button>;
}

function DeviceSelect({ label, items }) {
  return <label>{label}<select>{items.map((item) => <option key={item.id}>{item.label}</option>)}</select></label>;
}
