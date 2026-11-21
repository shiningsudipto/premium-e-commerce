"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { Dropdown as BaseDropdown, type DropdownTheme } from "react-customizable-dropdown";
import { cn } from "@/lib/utils";

// The console's dropdown: react-customizable-dropdown dressed in the admin palette. Colours
// come from the theme tokens in app/(admin)/admin.css (CSS variables work in inline styles), and
// the few things the library hard-codes (closed border, sublabel grey) are overridden in the
// `.ui-dropdown` rules in the same file.

export type DropdownItem<V extends string = string> = {
  value: V;
  label: string;
  /** Second line under the label, e.g. what choosing it does. */
  description?: string;
  /** Shown before the label: a status dot, an icon. */
  icon?: ReactNode;
  disabled?: boolean;
};

type Size = "sm" | "default";

const THEME: DropdownTheme = {
  primaryColor: "var(--primary)",
  backgroundColor: "var(--card)",
  menuBackgroundColor: "var(--popover)",
  textColor: "var(--foreground)",
  optionTextColor: "var(--popover-foreground)",
  hoverColor: "var(--accent)",
  selectedOptionTextColor: "var(--primary)",
  selectedOptionBackgroundColor: "color-mix(in oklch, var(--accent) 70%, var(--card))",
  multiSelectSelectedOptionTextColor: "var(--accent-foreground)",
  multiSelectSelectedOptionBackgroundColor: "var(--accent)",
  focusBorderColor: "var(--ring)",
};

const TRIGGER: Record<Size, CSSProperties> = {
  sm: { minHeight: "2rem", padding: "0 0.5rem 0 0.625rem", fontSize: "0.8125rem" },
  default: { minHeight: "2.25rem", padding: "0 0.625rem 0 0.75rem", fontSize: "0.875rem" },
};

export type DropdownProps<V extends string> = {
  items: DropdownItem<V>[];
  /** The chosen value; null or undefined shows the placeholder. */
  value: V | null | undefined;
  onChange: (value: V) => void;
  /** Shows a × that clears the choice (calls onClear). */
  clearable?: boolean;
  onClear?: () => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  size?: Size;
  /** Names the control for screen readers when there's no visible label. */
  "aria-label"?: string;
  className?: string;
  menuClassName?: string;
};

export function Dropdown<V extends string>({
  items,
  value,
  onChange,
  clearable = false,
  onClear,
  placeholder = "Select…",
  searchable = false,
  disabled = false,
  loading = false,
  size = "default",
  "aria-label": ariaLabel,
  className,
  menuClassName,
}: DropdownProps<V>) {
  // the library renders whatever sits in the label field, so the icon travels with it; the
  // plain text stays in `text` for its search filter
  const options = useMemo(
    () =>
      items.map((item) => ({
        value: item.value,
        text: item.label,
        display: item.icon ? (
          <span className="inline-flex items-center gap-2">
            {item.icon}
            {item.label}
          </span>
        ) : (
          item.label
        ),
        sublabel: item.description,
        disabled: item.disabled,
      })),
    [items],
  );

  return (
    <div role="group" aria-label={ariaLabel} className={cn("ui-dropdown", clearable && "ui-dropdown--clearable", className)}>
      <BaseDropdown
        options={options}
        value={value ?? null}
        labelField={searchable ? "text" : "display"}
        onChange={(next: unknown) => {
          if (next === "" || next == null) {
            if (clearable) onClear?.();
            return;
          }
          if (next !== value) onChange(next as V);
        }}
        placeholder={placeholder}
        searchable={searchable}
        disabled={disabled}
        loading={loading}
        theme={THEME}
        triggerClassName="ui-dropdown__trigger"
        triggerStyle={TRIGGER[size]}
        menuClassName={cn("ui-dropdown__menu", menuClassName)}
        sublabelClassName="ui-dropdown__sub"
        style={{ fontSize: TRIGGER[size].fontSize }}
      />
    </div>
  );
}
