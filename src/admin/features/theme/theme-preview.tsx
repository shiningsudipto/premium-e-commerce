"use client";

import type { CSSProperties } from "react";
import { scaledSize, themeCssVariables, type ColorMode, type ThemeTokens } from "./tokens";

const v = (name: string) => `var(--${name})`;
const space = (n: number) => `calc(var(--spacing-unit) * ${n})`;

// A slice of storefront UI drawn only with the edited tokens. The CSS variables are set on
// this element, so they apply to the preview and nothing else in the admin.
export function ThemePreview({ tokens, mode }: { tokens: ThemeTokens; mode: ColorMode }) {
  const vars = themeCssVariables(tokens, mode) as CSSProperties;
  const base = tokens.typography.baseSizePx;
  const button: CSSProperties = {
    borderRadius: v("button-radius"),
    textTransform: v("button-transform") as CSSProperties["textTransform"],
    padding: `${space(2.5)} ${space(4)}`,
    fontFamily: v("font-body"),
    fontSize: base * 0.875,
    fontWeight: 600,
    letterSpacing: tokens.buttons.uppercase ? "0.06em" : undefined,
    cursor: "default",
  };

  return (
    <div
      role="region"
      aria-label={`Storefront preview, ${mode} colours`}
      style={{
        ...vars,
        background: v("color-background"),
        color: v("color-foreground"),
        fontFamily: v("font-body"),
        fontSize: v("font-size-base"),
        lineHeight: 1.5,
        borderRadius: v("radius-lg"),
        border: `1px solid ${v("color-border")}`,
        padding: space(6),
      }}
      className="overflow-hidden"
    >
      <p style={{ fontSize: base * 0.75, color: v("color-muted-foreground"), letterSpacing: "0.08em" }}>NEW SEASON</p>
      <p
        style={{
          fontFamily: v("font-heading"),
          fontSize: scaledSize(tokens, 3),
          lineHeight: 1.15,
          margin: `${space(1)} 0 ${space(2)}`,
          fontWeight: 600,
        }}
      >
        Linen, slowly made
      </p>
      <p style={{ color: v("color-muted-foreground"), marginBottom: space(5), maxWidth: "36ch" }}>
        Breathable everyday pieces, cut in small batches.{" "}
        <a
          href="#preview"
          onClick={(e) => e.preventDefault()}
          style={{ color: v("color-accent"), textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          Read the story
        </a>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: space(4),
          alignItems: "start",
        }}
      >
        <article
          style={{
            border: `1px solid ${v("color-border")}`,
            borderRadius: v("radius-md"),
            overflow: "hidden",
            background: v("color-background"),
            boxShadow: tokens.shadows.card ? v("shadow-card") : undefined,
          }}
        >
          <div aria-hidden style={{ aspectRatio: "4 / 3", background: v("color-muted"), position: "relative" }}>
            <span
              style={{
                position: "absolute",
                top: space(2),
                left: space(2),
                background: v("color-accent"),
                color: v("color-accent-foreground"),
                borderRadius: v("radius-sm"),
                fontSize: base * 0.75,
                fontWeight: 600,
                padding: `${space(0.5)} ${space(2)}`,
              }}
            >
              New
            </span>
          </div>
          <div style={{ padding: space(3) }}>
            <p style={{ fontFamily: v("font-heading"), fontSize: scaledSize(tokens, 1), fontWeight: 600 }}>
              Linen shirt
            </p>
            <p style={{ marginTop: space(1), display: "flex", gap: space(2), alignItems: "baseline" }}>
              <span style={{ fontWeight: 600, color: v("color-destructive") }}>৳2,450</span>
              <s style={{ color: v("color-muted-foreground"), fontSize: base * 0.875 }}>৳3,200</s>
            </p>
            <p style={{ color: v("color-muted-foreground"), fontSize: base * 0.875 }}>3 colours</p>
          </div>
        </article>

        <div style={{ display: "flex", flexDirection: "column", gap: space(3) }}>
          <span
            style={{
              ...button,
              background: v("color-primary"),
              color: v("color-primary-foreground"),
              textAlign: "center",
            }}
          >
            Add to cart
          </span>
          <span
            style={{
              ...button,
              background: v("color-secondary"),
              color: v("color-secondary-foreground"),
              textAlign: "center",
            }}
          >
            Save for later
          </span>
          <div
            style={{
              background: v("color-muted"),
              color: v("color-muted-foreground"),
              borderRadius: v("radius-md"),
              padding: space(3),
              fontSize: base * 0.875,
            }}
          >
            Free delivery over ৳3,000
          </div>
          <div>
            <span style={{ display: "block", fontSize: base * 0.875, fontWeight: 500, marginBottom: space(1) }}>
              Email
            </span>
            <span
              style={{
                display: "block",
                border: `1px solid ${v("color-destructive")}`,
                borderRadius: v("radius-sm"),
                padding: `${space(2)} ${space(3)}`,
                color: v("color-muted-foreground"),
                fontSize: base * 0.875,
              }}
            >
              you@example
            </span>
            <span
              style={{ display: "block", color: v("color-destructive"), fontSize: base * 0.8125, marginTop: space(1) }}
            >
              Enter a complete email address
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
