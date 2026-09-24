import { useState } from 'react';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { authService } from '../services/auth';

export default function JoinMeetingPage({ navigation }) {
  const { navigate } = navigation;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function join(event) {
    event.preventDefault();
    const id = code.trim().split('/').filter(Boolean).at(-1);
    if (!id || id.length < 4) { setError('Introduce un código o enlace válido.'); return; }
    await authService.joinAsGuest({ name: name || 'Invitado', meetingId: id });
    navigate(`/m/${id}`);
  }

  return <section className="page-wrap narrow-page join-page"><PageHeader eyebrow="ACCESO RÁPIDO" title="Unirse a una reunión" description="Accede con un código O7 Meet o pega el enlace completo de la sala." /><div className="join-layout"><form className="card join-form" onSubmit={join}><div className="join-visual"><div className="join-orbit"><Icon name="video" size={30} /></div><h2>Listo cuando tú lo estés.</h2><p>Puedes entrar como invitado sin una cuenta O7 cuando el anfitrión lo permita.</p></div><label>Tu nombre<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre visible en la reunión" /></label><label>Código o enlace<input autoFocus value={code} onChange={(e) => { setCode(e.target.value); setError(''); }} placeholder="meet.o7digital.com/m/xxxxx" /></label>{error && <p className="form-error">{error}</p>}<button className="primary full-button"><Icon name="video" /> Unirse ahora</button><div className="privacy-note">Al entrar, aceptas el uso de audio y vídeo de acuerdo con los permisos de tu navegador.</div></form><aside className="join-tips"><small>ANTES DE ENTRAR</small><h2>Una experiencia clara desde el primer minuto.</h2><ul><li><Icon name="check" /> Revisa tu cámara y micrófono.</li><li><Icon name="check" /> Usa auriculares para evitar eco.</li><li><Icon name="check" /> Olivia solo se activa si el anfitrión lo permite.</li></ul><span className="mock-badge">VIDEO PROVIDER · DEMO MODE</span></aside></div></section>;
}
