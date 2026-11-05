"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

// Errors below the root layout; the header and footer of the root stay usable around it.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  useEffect(() => console.error(error), [error]);
  return (
    <main id="main" className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-start gap-4 px-4 py-24 sm:px-6">
      <h1 className="text-3xl tracking-tight sm:text-4xl">{t("errorTitle")}</h1>
      <p className="max-w-md text-muted-foreground">{t("errorBody")}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        {t("retry")}
      </button>
      {error.digest && <p className="text-xs text-muted-foreground">{t("reference", { id: error.digest })}</p>}
    </main>
  );
}
