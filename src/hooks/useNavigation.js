import { useCallback, useEffect, useMemo, useState } from 'react';

function parsePath(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'home', params: {} };
  if (path === '/new') return { name: 'create', params: {} };
  if (path === '/join') return { name: 'join', params: {} };
  if (path === '/meetings') return { name: 'meetings', params: {} };
  const meeting = path.match(/^\/m\/([^/]+)$/);
  if (meeting) return { name: 'meeting', params: { id: meeting[1] } };
  const summary = path.match(/^\/summary\/([^/]+)$/);
  if (summary) return { name: 'summary', params: { id: summary[1] } };
  return { name: 'home', params: {} };
}

export function useNavigation() {
  const [route, setRoute] = useState(() => parsePath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path, options = {}) => {
    window.history[options.replace ? 'replaceState' : 'pushState']({}, '', path);
    setRoute(parsePath(path));
    window.scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' });
  }, []);

  return useMemo(() => ({ route, navigate }), [route, navigate]);
}
