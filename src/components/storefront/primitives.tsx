import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon } from "./icon";

// Small building blocks shared by every storefront block. Styles come from the Premium Touch
// partials in src/styles/premium-touch.

// Headings in the design italicize a closing phrase: "Four things, *done properly.*"
export type Emphasized = { text: string; em?: string; after?: string };

export function EmText({ value }: { value: Emphasized }) {
  return (
    <>
      {value.text}
      {value.em && (
        <>
          {value.text && " "}
          <em>{value.em}</em>
        </>
      )}
      {value.after && ` ${value.after}`}
    </>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={["eyebrow", className].filter(Boolean).join(" ")}>{children}</p>;
}

export function SectionHead({
  id,
  eyebrow,
  title,
  action,
  className,
}: {
  id: string;
  eyebrow: string;
  title: Emphasized;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={["section-head reveal", className].filter(Boolean).join(" ")}>
      <div className="section-head__text">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="h2" id={id}>
          <EmText value={title} />
        </h2>
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "light";

export const buttonClass = (variant: ButtonVariant, extra?: string | false) =>
  ["btn", `btn--${variant}`, extra].filter(Boolean).join(" ");

// A link styled as a button; `arrow` adds the trailing arrow that nudges on hover.
export function ButtonLink({
  variant = "primary",
  arrow,
  className,
  children,
  ...props
}: { variant?: ButtonVariant; arrow?: boolean } & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, className)} {...props}>
      {children}
      {arrow && <Icon name="arrow" size="sm" className="icon--arrow" />}
    </Link>
  );
}

export function LinkArrow({ className, children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link className={["link-arrow", className].filter(Boolean).join(" ")} {...props}>
      {children}
      <Icon name="arrow" size="sm" />
    </Link>
  );
}

export function Stars({ label, size }: { label?: string; size?: "sm" }) {
  const stars = Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" size={size} filled />);
  return label ? (
    <span className="stars" role="img" aria-label={label}>
      {stars}
    </span>
  ) : (
    <span className="stars" aria-hidden="true">
      {stars}
    </span>
  );
}

const SWATCH_VARS: Record<string, string> = {
  tan: "var(--swatch-tan)",
  chestnut: "var(--swatch-chestnut)",
  black: "var(--swatch-black)",
  natural: "var(--swatch-natural)",
  navy: "var(--swatch-navy)",
  brown: "var(--swatch-brown)",
};

// A colour name from the catalog ("Tan", "Navy") as a CSS colour; unknown names get a neutral.
export const swatchColor = (name: string) => SWATCH_VARS[name.trim().toLowerCase()] ?? "var(--swatch-default)";

export function Swatches({ colours }: { colours: string[] }) {
  if (!colours.length) return null;
  return (
    <div className="swatches" role="img" aria-label={`Available in ${colours.join(", ")}`}>
      {colours.map((c) => (
        <span key={c} className="swatch-dot" style={{ background: swatchColor(c) }} />
      ))}
    </div>
  );
}

export function Logo({ name, href, onDark, label }: { name: string; href: string; onDark?: boolean; label?: string }) {
  const [fill, ink] = onDark
    ? ["var(--color-secondary)", "var(--color-primary)"]
    : ["var(--color-primary)", "var(--color-secondary)"];
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toLowerCase() ?? "")
    .join("");
  return (
    <Link className="logo" href={href} aria-label={label ?? `${name}, home`}>
      <svg className="logo__mark" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="19" fill={fill} />
        <circle cx="20" cy="20" r="15.5" fill="none" stroke={ink} strokeWidth="1" strokeDasharray="2 2" />
        <text
          x="20"
          y="25"
          textAnchor="middle"
          fontFamily="var(--font-heading)"
          fontSize="14"
          fontStyle="italic"
          fill={ink}
        >
          {initials}
        </text>
      </svg>
      <span className="logo__word">{name}</span>
    </Link>
  );
}
