const paths = {
  video: 'M15 10l4.5-3v10L15 14v3H4V7h11v3z',
  mic: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zm-6 8a6 6 0 0 0 12 0M12 17v4m-4 0h8',
  micOff: 'M4 4l16 16M9 9v2a3 3 0 0 0 5 2.2M15 9V6a3 3 0 0 0-5.6-1.5M6 11a6 6 0 0 0 10 4.4M18 11a6 6 0 0 1-.5 2.4M12 17v4m-4 0h8',
  videoOff: 'M4 4l16 16M15 10l4.5-3v10L17 15.3M15 17H4V7h3',
  screen: 'M4 5h16v11H4zM8 20h8m-4-4v4',
  people: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8-1a2.5 2.5 0 1 0 0-5m-8 8c-3 0-5 1.5-5 4v1h10v-1c0-2.5-2-4-5-4zm8 0c2.7 0 4 1.3 4 3.5V18h-6',
  chat: 'M4 5h16v11H9l-5 4z',
  spark: 'M12 2l1.5 5L18 8.5l-4.5 1.5L12 15l-1.5-5L6 8.5 10.5 7zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z',
  grid: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z',
  phone: 'M7 3l3 4-2 2c1.6 3 3.9 5.4 7 7l2-2 4 3-2 4c-8 0-16-8-16-16z',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  calendar: 'M5 4v3m14-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v13H4V7a1 1 0 0 1 1-1z',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm5-2 5 5',
  link: 'M10 13a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-5.5-5.8l-1.7 1.7M14 11a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 5.5 5.8l1.7-1.7',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm8 3 2-1-2-3-2 .3-1-1.7.7-2.2-3-1.4-1.5 1.4.7 2.2-1 1.7L4 8l-2 3 2 1v2l-2 1 2 3 2-.3L7 19.4l-.7 2.2 3 1.4 1.5-1.4 2.2.4 1 2 3-1 .1-2.2 1.8-1.2 2.1.4 2-3-2-1z',
  fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5',
  userPlus: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-7 2-7 6v1h14v-1c0-4-3-6-7-6zm10-5v6m-3-3h6',
  chevron: 'M8 10l4 4 4-4',
  check: 'M5 12l4 4L19 6',
  close: 'M6 6l12 12M18 6 6 18',
  mail: 'M3 5h18v14H3zM3 6l9 8 9-8',
  download: 'M12 3v13m-5-5 5 5 5-5M4 21h16',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4v5l3 2',
};

export function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
