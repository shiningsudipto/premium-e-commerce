import type { ReactNode } from "react";
import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { StoreConfig } from "../lib/store-data";

// The year is cached for a day so the footer stays part of the prerendered shell.
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

// Footer with a `columns` slot for footer menus (Phase 1).
export async function SiteFooter({ config, columns }: { config: StoreConfig; columns?: ReactNode }) {
  const [t, year] = await Promise.all([getTranslations("footer"), currentYear()]);
  return (
    <footer className="mt-auto border-t border-border bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {columns}
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t.rich("help", {
              email: config.supportEmail,
              mail: (chunks) => (
                <a className="underline underline-offset-4" href={`mailto:${config.supportEmail}`}>
                  {chunks}
                </a>
              ),
            })}
          </p>
          <p className="opacity-80">{t("rights", { year, store: config.storeName })}</p>
        </div>
      </div>
    </footer>
  );
}
