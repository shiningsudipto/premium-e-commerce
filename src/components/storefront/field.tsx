import type { InputHTMLAttributes, ReactNode } from "react";

// A labelled input with its error and hint tied to it (aria-describedby), for checkout and
// account forms. `error` is already translated.
export function Field({
  label,
  name,
  error,
  hint,
  className,
  children,
  ...input
}: {
  label: ReactNode;
  name: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  // a custom control (select, textarea) in place of the input
  children?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = input.id ?? `f-${name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={["field", className].filter(Boolean).join(" ")}>
      <label htmlFor={id}>{label}</label>
      {children ?? (
        <input
          className="input"
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...input}
        />
      )}
      {hint && (
        <span className="field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
