import { useCallback, useEffect, useState } from 'react';

export function useToast(delay = 3200) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(() => setMessage(''), delay);
    return () => window.clearTimeout(timeout);
  }, [message, delay]);
  return { message, show: useCallback((next) => setMessage(next), []), close: useCallback(() => setMessage(''), []) };
}
