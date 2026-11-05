import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <div role="status" aria-live="polite" className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-24 sm:px-6">
      <span className="sr-only">{t("loading")}</span>
      <div className="h-4 w-24 animate-pulse rounded-sm bg-muted" />
      <div className="h-14 w-full max-w-2xl animate-pulse rounded-md bg-muted" />
      <div className="h-5 w-full max-w-md animate-pulse rounded-sm bg-muted" />
    </div>
  );
}
