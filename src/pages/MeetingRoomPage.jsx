import { useEffect, useState } from 'react';
import { ConfirmDialog, Toast } from '../components/Feedback';
import { Icon } from '../components/Icon';
import { ChatPanel } from '../features/meetings/ChatPanel';
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
  const [elapsed, setElapsed] = useState(0);
  const toast = useToast();
  const sideOpen = olivia || panel;

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    getVideoProvider().listDevices().then(setDevices);
    return () => window.clearInterval(timer);
  }, []);

  const time = new Date(elapsed * 1000).toISOString().slice(11, 19);
  const togglePanel = (next) => { setOlivia(false); setPanel((current) => current === next ? '' : next); };
  async function copyLink() { await navigator.clipboard?.writeText(window.location.href); toast.show('Enlace de reunión copiado.'); }
  async function toggleFullscreen() { if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.(); else await document.exitFullscreen?.(); }
  function finishMeeting() { setLeaveOpen(false); navigate('/import'); }

  return <section className="meeting-stage">
    <header className="meeting-header"><button className="meeting-brand" onClick={() => setLeaveOpen(true)}><span><i>O</i><b>7</b></span> Meet</button><div><small>O7 MEET · <span className="live-dot" /> LIVE</small><h1>{sessionStorage.getItem(`meet-title:${params.id}`) || `Salle ${params.id.slice(0, 12)}`}</h1></div><div className="meeting-meta"><span>{controls.status === 'connecting' ? 'Conectando…' : time}</span><span>·</span><span>{controls.participantCount || 0} participantes</span><button onClick={copyLink} title="Copiar enlace"><Icon name="link" /></button><button onClick={toggleFullscreen} title="Pantalla completa"><Icon name="fullscreen" /></button><button onClick={() => setSettingsOpen(true)} title="Ajustes"><Icon name="settings" /></button></div></header>
    {controls.error && <div className="connection-alert">{controls.error} <button onClick={() => window.location.reload()}>Reintentar</button></div>}
    <div className={`meeting-grid ${sideOpen ? 'with-panel' : ''}`}>
      <VideoArea layout={layout} screenSharing={controls.screen} camera={controls.camera} localStream={controls.localStream} remoteStream={controls.remoteStream} />
      {olivia && <OliviaPanel onClose={() => setOlivia(false)} />}
      {panel === 'participants' && <ParticipantsPanel onClose={() => setPanel('')} onInvite={copyLink} />}
      {panel === 'chat' && <ChatPanel onClose={() => setPanel('')} />}
    </div>
    <div className="meeting-footer"><div className="layout-switch"><button className={layout === 'speaker' ? 'active' : ''} onClick={() => setLayout('speaker')}>Speaker</button><button className={layout === 'gallery' ? 'active' : ''} onClick={() => setLayout('gallery')}>Gallery</button><button className={layout === 'focus' ? 'active' : ''} onClick={() => setLayout('focus')}>Focus</button></div><div className="controls"><ControlButton active={controls.mic} dangerWhenInactive icon={controls.mic ? 'mic' : 'micOff'} label="Micrófono" onClick={() => controls.toggle('mic')} /><ControlButton active={controls.camera} dangerWhenInactive icon={controls.camera ? 'video' : 'videoOff'} label="Cámara" onClick={() => controls.toggle('camera')} /><ControlButton active={controls.screen} showActive icon="screen" label="Compartir" onClick={() => controls.toggle('screen')} /><ControlButton active={panel === 'chat'} showActive icon="chat" label="Chat" onClick={() => togglePanel('chat')} /><ControlButton active={panel === 'participants'} showActive icon="people" label="Personas" onClick={() => togglePanel('participants')} /><button className={`ai-control ${olivia ? 'active' : ''}`} onClick={() => { setPanel(''); setOlivia(!olivia); }}><Icon name="spark" /><span>Olivia</span></button><button className="hang" onClick={() => setLeaveOpen(true)}><Icon name="phone" /><span>Salir</span></button></div><button className="invite-shortcut" onClick={() => togglePanel('participants')}><Icon name="userPlus" /> Invitar</button></div>
    <ConfirmDialog open={leaveOpen} title="¿Salir de la reunión?" confirmLabel="Salir e importar" secondaryLabel="Salir de la reunión" onClose={() => setLeaveOpen(false)} onSecondary={finishMeeting} onConfirm={finishMeeting}><p>Después de salir, puede importar una transcripción o grabación en el espacio privado Olivia. No hay grabación automática en esta sala.</p></ConfirmDialog>
    {settingsOpen && <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}><div className="modal settings-modal" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setSettingsOpen(false)}><Icon name="close" /></button><small>DISPOSITIVOS</small><h2>Ajustes de audio y vídeo</h2><DeviceSelect label="Micrófono" items={devices.microphones} /><DeviceSelect label="Cámara" items={devices.cameras} /><DeviceSelect label="Altavoz" items={devices.speakers} /><p className="mock-note">Sélection des appareils : utilisez les réglages de votre navigateur. Ces listes n’appliquent pas de changement de périphérique.</p><button className="primary full-button" onClick={() => setSettingsOpen(false)}>Guardar preferencias</button></div></div>}
    <Toast message={toast.message} onClose={toast.close} />
  </section>;
}

function VideoArea({ layout, screenSharing, camera, localStream, remoteStream }) {
  if (localStream || remoteStream) return <div className={`video-area layout-${layout} live-video-area`}><LiveVideo stream={remoteStream} label="Participante" /><LiveVideo stream={localStream} label="Tú" muted camera={camera} /></div>;
  return <div className={`video-area layout-${layout} live-video-area`}><div className="person-tile live-tile"><div className="camera-off-label">Connexion aux flux vidéo…</div></div></div>;
}

function LiveVideo({ stream, label, muted = false, camera = true }) {
  const ref = (node) => { if (node && stream && node.srcObject !== stream) node.srcObject = stream; };
  return <div className="person-tile live-tile"><video ref={ref} autoPlay playsInline muted={muted} className={!camera ? 'video-hidden' : ''} /><div className="nameplate">{label}</div>{!camera && <div className="camera-off-label">Cámara apagada</div>}</div>;
}

function ControlButton({ active, dangerWhenInactive = false, showActive = false, icon, label, onClick }) {
  const className = dangerWhenInactive && !active ? 'control-off' : showActive && active ? 'control-active' : '';
  return <button className={className} onClick={onClick} title={label}><Icon name={icon} /><span>{label}</span></button>;
}

function DeviceSelect({ label, items }) {
  return <label>{label}<select>{items.map((item) => <option key={item.id}>{item.label}</option>)}</select></label>;
}
