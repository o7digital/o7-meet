import { createContext, useContext, useMemo, useState } from 'react';

const messages = {
  es: {
    newMeeting: 'Nueva reunión', joinMeeting: 'Unirse a una reunión', schedule: 'Programar reunión',
    meetings: 'Mis reuniones', calendar: 'Calendario', search: 'Buscar reuniones, clientes o participantes',
    upcoming: 'Próximas reuniones', recent: 'Reuniones recientes', seeAll: 'Ver todas', enter: 'Entrar',
    meetingIntelligence: 'Tu inteligencia de reuniones', poweredBy: 'AI powered by Olivia One',
    copied: 'Enlace copiado', simulated: 'Acción simulada — integración aún no conectada',
  },
  en: {
    newMeeting: 'New meeting', joinMeeting: 'Join a meeting', schedule: 'Schedule meeting',
    meetings: 'My meetings', calendar: 'Calendar', search: 'Search meetings, clients or participants',
    upcoming: 'Upcoming meetings', recent: 'Recent meetings', seeAll: 'See all', enter: 'Enter',
    meetingIntelligence: 'Your meeting intelligence', poweredBy: 'AI powered by Olivia One',
    copied: 'Link copied', simulated: 'Simulated action — integration not connected yet',
  },
  fr: {
    newMeeting: 'Nouvelle réunion', joinMeeting: 'Rejoindre une réunion', schedule: 'Planifier une réunion',
    meetings: 'Mes réunions', calendar: 'Calendrier', search: 'Rechercher réunions, clients ou participants',
    upcoming: 'Prochaines réunions', recent: 'Réunions récentes', seeAll: 'Tout voir', enter: 'Entrer',
    meetingIntelligence: 'Votre intelligence de réunion', poweredBy: 'IA propulsée par Olivia One',
    copied: 'Lien copié', simulated: 'Action simulée — intégration pas encore connectée',
  },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem('o7-locale') || 'es');
  const value = useMemo(() => ({
    locale,
    setLocale(next) {
      localStorage.setItem('o7-locale', next);
      document.documentElement.lang = next;
      setLocale(next);
    },
    t(key) { return messages[locale]?.[key] || messages.es[key] || key; },
  }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
