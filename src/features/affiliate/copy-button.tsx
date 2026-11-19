"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// Copies `text` and confirms for a moment, visibly and to screen readers. `label` names what is
// copied ("Copy code SAVE10"), so several buttons on a page stay distinguishable.
export function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const t = useTranslations("affiliate.copy");
  const [state, setState] = useState<"" | "copied" | "failed">("");

  useEffect(() => {
    if (!state) return;
    const timer = setTimeout(() => setState(""), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <>
      <button type="button" className={className ?? "btn btn--secondary affiliate-copy"} onClick={copy}>
        {state === "copied" ? t("copied") : label}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? t("copiedNote") : state === "failed" ? t("failed") : ""}
      </span>
      {state === "failed" && (
        <span className="field__error" aria-hidden="true">
          {t("failed")}
        </span>
      )}
    </>
  );
}
