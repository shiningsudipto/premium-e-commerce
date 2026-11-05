import type { SVGProps } from "react";

// Line icons from the Premium Touch design, drawn on a 24px grid with the .icon stroke styles.
const PATHS = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c1.4-3.6 4.2-5.3 7.5-5.3s6.1 1.7 7.5 5.3" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1.2 12H6.2z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  menu: <path d="M3.5 7h17M3.5 12h17M3.5 17h11" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  star: <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />,
  check: <path d="M4.5 12.5l4.5 4.5 10.5-10.5" />,
  truck: (
    <>
      <path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z" />
      <path d="M8.8 12l2.2 2.2 4.4-4.4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="1.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="1.5" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.3" />
    </>
  ),
  play: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="3" />
      <path d="M10.5 9.5v5l4-2.5z" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  empty: (
    <>
      <path d="M5 8h14l-1.2 12H6.2z" strokeDasharray="2 2" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size,
  filled,
  className,
  ...props
}: { name: IconName; size?: "sm"; filled?: boolean } & SVGProps<SVGSVGElement>) {
  const classes = ["icon", size === "sm" && "icon--sm", filled && "icon--fill", className].filter(Boolean).join(" ");
  return (
    <svg viewBox="0 0 24 24" className={classes} aria-hidden="true" focusable="false" {...props}>
      {PATHS[name]}
    </svg>
  );
}
