import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { market } from "next/root-params";
import { env } from "../lib/env";
import { href } from "../lib/links";
import { parseMarketSegment } from "../lib/market";

export async function NotFoundView() {
  const ref = parseMarketSegment(await market()) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
  const t = await getTranslations("errors");
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
      <p className="font-serif text-8xl text-muted-foreground/40" aria-hidden>
        404
      </p>
      <h1 className="text-3xl tracking-tight sm:text-4xl">{t("notFoundTitle")}</h1>
      <p className="max-w-md text-muted-foreground">{t("notFoundBody")}</p>
      <Link href={href(ref)} className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
        {t("backHome")}
      </Link>
    </section>
  );
}
