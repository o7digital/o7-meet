import { useCallback, useEffect, useState } from 'react';
import { getVideoProvider } from '../features/video/provider';

const initialState = { mic: true, camera: true, screen: false, status: 'connecting', error: '' };

export function useMeetingControls(roomId) {
  const [state, setState] = useState(initialState);
  useEffect(() => {
    let active = true;
    const provider = getVideoProvider();
    const unsubscribe = provider.subscribe?.((next) => active && setState((current) => ({ ...current, ...next, status: next.connected ? 'connected' : current.status })));
    provider.connect(roomId).then(() => active && setState((current) => ({ ...current, status: 'connected' }))).catch((error) => active && setState((current) => ({ ...current, status: 'error', error: error.message || 'No se pudo conectar a la sala.' })));
    return () => { active = false; unsubscribe?.(); provider.disconnect(); };
  }, [roomId]);

  const toggle = useCallback(async (key) => {
    const next = !state[key];
    const methods = { mic: 'setMicrophoneEnabled', camera: 'setCameraEnabled', screen: 'setScreenShareEnabled' };
    try {
      await getVideoProvider()[methods[key]](next);
      setState((current) => ({ ...current, [key]: next, error: '' }));
    } catch {
      setState((current) => ({ ...current, error: `${key === 'mic' ? 'Micrófono' : 'Cámara'} no disponible.` }));
    }
  }, [state]);

  return { ...state, toggle };
}
