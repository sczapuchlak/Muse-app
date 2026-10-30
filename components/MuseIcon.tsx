const paths = {
  grip: <path d="M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01" />,
  filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  home: <><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7" /></>,
  rituals: <><path d="M7 20h10M8 17V9h8v8M12 3c-3 3-2 5 0 5s3-2 0-5Z" /></>,
  insights: <><path d="M4 4v16h16M8 15l4-5 4 2 4-6" /></>,
  money: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 9h18M15 14h3M7 5V3" /></>,
  notes: <><path d="M6 3h9l4 4v14H5V3h1ZM14 3v5h5M8 12h8M8 16h6" /></>,
  appearance: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18Z" /></>,
  settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="15" cy="17" r="3" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  edit: <><path d="m15 4 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-4-4L5 15l-1 5Z" /></>,
  movement: <path d="m8 5 8 14M5 8l6-3M13 19l6-3M3 5l3 6M18 13l3 6" />,
  water: <path d="M12 3C10 6 5 11 5 15a7 7 0 0 0 14 0c0-4-5-9-7-12ZM9 15a3 3 0 0 0 3 3" />,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4M16 3v4M4 11h16M8 15h2M14 15h2" /></>,
  meals: <path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M19 21V3c-4 3-5 8 0 9" />,
  mood: <><circle cx="12" cy="12" r="9" /><path d="M8 14a4 4 0 0 0 8 0M8 9h.01M16 9h.01" /></>,
  moon: <path d="M20.8 13a9 9 0 0 1-9.8-9.8A9 9 0 1 0 20.8 13Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
};

export type MuseIconName = keyof typeof paths;

export function MuseIcon({ name, size = 20 }: { name: MuseIconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}
