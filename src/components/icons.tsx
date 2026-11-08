interface IconProps {
  className?: string;
}

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconOverview({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M4 13.5 9 8l4 4 7-7" />
      <path d="M4 19.5h16" />
    </svg>
  );
}

export function IconTops({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3" />
      <path d="M12 13v4M9 20h6" />
    </svg>
  );
}

export function IconActivity({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="3.5" />
      <path d="M3.5 10h17M8 3.5V6M16 3.5V6" />
      <path d="M8.5 14.5h2.5M13.5 14.5h2M8.5 17.5h7" />
    </svg>
  );
}

export function IconYear({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" />
      <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </svg>
  );
}

export function IconGear({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M4 7h8M18 7h2M4 12h2M12 12h8M4 17h9M19 17h1" />
      <circle cx="15" cy="7" r="2.1" />
      <circle cx="9" cy="12" r="2.1" />
      <circle cx="16" cy="17" r="2.1" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconShare({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 3.5v11" />
      <path d="M8 7.5 12 3.5l4 4" />
      <path d="M5.5 13v5a2.5 2.5 0 0 0 2.5 2.5h8a2.5 2.5 0 0 0 2.5-2.5v-5" />
    </svg>
  );
}

export function IconUpload({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" width={30} height={30}>
      <path d="M12 16.5V4.5" />
      <path d="M7 9.5 12 4.5l5 5" />
      <path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11A2.5 2.5 0 0 0 20 18.5V15" />
    </svg>
  );
}

export function IconChevron({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" width={16} height={16}>
      <path d="m5 9 7 7 7-7" />
    </svg>
  );
}
