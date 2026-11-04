// One icon family: 24px grid, 2px round strokes, currentColor. The ✦ mark is the brand's own shape.
type Props = { size?: number; className?: string };

function Svg({ size = 20, className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function Spark({ size = 18, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M12 1.5c.5 5.6 4.9 10 10.5 10.5-5.6.5-10 4.9-10.5 10.5-.5-5.6-4.9-10-10.5-10.5C7.1 11.5 11.5 7.1 12 1.5Z" />
    </svg>
  );
}

export const Close = (p: Props) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const Back = (p: Props) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const Copy = (p: Props) => (
  <Svg {...p}>
    <rect x="8" y="8" width="12" height="12" rx="3" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Svg>
);

export const Check = (p: Props) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const External = (p: Props) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </Svg>
);

export const Photo = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M21 16l-5-5-8 8" />
  </Svg>
);

export const Retry = (p: Props) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
  </Svg>
);

export const ArrowRight = (p: Props) => (
  <Svg {...p}>
    <path d="M4 12h15M13 5l7 7-7 7" />
  </Svg>
);

export const Gamepad = (p: Props) => (
  <Svg {...p}>
    <path d="M7.5 8h9a4.5 4.5 0 0 1 4.3 3.2l1.1 3.7a2.4 2.4 0 0 1-3.8 2.6l-2.4-1.8H8.3l-2.4 1.8a2.4 2.4 0 0 1-3.8-2.6l1.1-3.7A4.5 4.5 0 0 1 7.5 8Z" />
    <path d="M8 11v4M6 13h4M16 12h.01M18 14h.01" />
  </Svg>
);

export const Puzzle = (p: Props) => (
  <Svg {...p}>
    <path d="M9 4h2a2.5 2.5 0 1 1 5 0h2a2 2 0 0 1 2 2v3h-1a2.5 2.5 0 1 0 0 5h1v4a2 2 0 0 1-2 2h-4v-1a2.5 2.5 0 1 0-5 0v1H6a2 2 0 0 1-2-2v-4h1a2.5 2.5 0 1 0 0-5H4V6a2 2 0 0 1 2-2h3Z" />
  </Svg>
);

export const Compass = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
  </Svg>
);

export const CircleCheck = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.5 2.5L16.5 9" />
  </Svg>
);
