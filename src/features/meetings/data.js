export const participants = [
  { id: 'p1', initials: 'CS', name: 'Charles', role: 'Operations', connected: true },
  { id: 'p2', initials: 'LM', name: 'Lucía', role: 'Sales', connected: true },
  { id: 'p3', initials: 'JM', name: 'Jorge', role: 'Design', connected: true },
  { id: 'p4', initials: 'OS', name: 'Olivier', role: 'Host', connected: true, isSelf: true },
  { id: 'p5', initials: 'AR', name: 'Ana', role: 'Artimex', connected: false },
];

export const meetings = [
  { id: 'artimex-7f3k2', title: 'Artimex — E-commerce & Data', description: 'Roadmap e-commerce, catalogue et intégration R365.', date: '2026-09-23', dateLabel: 'Hoy', time: '19:30', duration: 42, participants: participants.slice(0, 5), client: 'Artimex', opportunity: 'E-commerce 2026', status: 'scheduled', statusLabel: 'Programada', hasSummary: false, link: 'https://meet.o7digital.com/m/artimex-7f3k2' },
  { id: 'kabin-x9c4p', title: 'Kabin Financial', description: 'Backend et catalogue premium.', date: '2026-09-23', dateLabel: 'Hoy', time: '21:00', duration: 45, participants: participants.slice(1, 4), client: 'Kabin', status: 'scheduled', statusLabel: 'Programada', hasSummary: false, link: 'https://meet.o7digital.com/m/kabin-x9c4p' },
  { id: 'elite-f8e2q', title: 'Elite Ride — CRM rollout', date: '2026-09-22', dateLabel: 'Ayer', time: '16:00', duration: 52, participants: participants.slice(0, 4), client: 'Elite Ride', status: 'completed', statusLabel: 'Completada', hasSummary: true, link: 'https://meet.o7digital.com/m/elite-f8e2q' },
  { id: 'o7-review-a2d8m', title: 'O7 Internal — Product review', date: '2026-09-21', dateLabel: '21 sep', time: '11:00', duration: 38, participants: participants.slice(0, 3), client: 'O7 Digital', status: 'completed', statusLabel: 'Completada', hasSummary: true, link: 'https://meet.o7digital.com/m/o7-review-a2d8m' },
  { id: 'casa-g4n7r', title: 'Casa Firme — Website', date: '2026-09-18', dateLabel: '18 sep', time: '10:30', duration: 44, participants: participants.slice(1, 5), client: 'Casa Firme', status: 'completed', statusLabel: 'Completada', hasSummary: true, link: 'https://meet.o7digital.com/m/casa-g4n7r' },
];

export const activeMeeting = meetings[0];

export const transcript = [
  { time: '19:52', who: 'Charles', text: 'We need the e-commerce flow ready before the seasonal peak.' },
  { time: '19:53', who: 'Olivia', text: 'Decision detected: prioritize online ordering and R365 integration.', ai: true },
  { time: '19:55', who: 'Olivier', text: 'I can prepare the technical scope and connect the catalog to the backend.' },
  { time: '20:02', who: 'Lucía', text: 'The client will validate the final catalog structure before Friday.' },
];

export const tasks = [
  { id: 't1', title: 'Prepare technical integration scope', owner: 'Olivier', deadline: '25 Sep', priority: 'HIGH', status: 'open' },
  { id: 't2', title: 'Validate product catalog structure', owner: 'Charles', deadline: '27 Sep', priority: 'MEDIUM', status: 'open' },
  { id: 't3', title: 'Confirm R365 export requirements', owner: 'Operations', deadline: '28 Sep', priority: 'MEDIUM', status: 'open' },
];
