import { useCallback, useEffect, useState } from 'react';
import { getVideoProvider } from '../features/video/provider';

const initialState = { mic: true, camera: true, screen: false, status: 'connecting', error: '' };

export function useMeetingControls(roomId) {
  const [state, setState] = useState(initialState);
  useEffect(() => {
    let active = true;
    getVideoProvider().connect(roomId).then(() => active && setState((current) => ({ ...current, status: 'connected' }))).catch(() => active && setState((current) => ({ ...current, status: 'error', error: 'No se pudo conectar a la sala.' })));
    return () => { active = false; getVideoProvider().disconnect(); };
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
