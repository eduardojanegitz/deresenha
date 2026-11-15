const base = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IconBack = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth={2.6} {...base} aria-hidden="true">
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const IconPhone = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth={2.2} {...base} aria-hidden="true">
    <rect x="7" y="2.5" width="10" height="19" rx="3" />
    <path d="M11 18h2" />
  </svg>
);
export const IconPhones = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth={2.2} {...base} aria-hidden="true">
    <rect x="2.5" y="5" width="8" height="15" rx="2.5" />
    <rect x="13.5" y="3" width="8" height="15" rx="2.5" />
  </svg>
);
export const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth={3} {...base} aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const IconSound = ({ muted }: { muted: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth={2.2} {...base} aria-hidden="true">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    {muted ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M16 9a4.5 4.5 0 010 6M18.5 6.5a8 8 0 010 11" />}
  </svg>
);
export const IconShare = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth={2.4} {...base} aria-hidden="true">
    <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" />
  </svg>
);
export const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth={2.6} {...base} aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="3" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
);
