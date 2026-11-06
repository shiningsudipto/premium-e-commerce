import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { AddressBook, type SavedAddress } from "@/src/features/account/forms";
import { getMarkets } from "@/src/lib/store-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("addresses"), robots: { index: false } };
}

export default async function AddressesPage() {
  const [ctx, t] = await Promise.all([requestContext(), getTranslations("account")]);
  const [addresses, markets] = await Promise.all([
    unwrap(serverApi(ctx).GET("/v1/store/account/addresses")),
    getMarkets().catch(() => []),
  ]);
  const countries = markets.find((m) => m.handle === ctx.market.market)?.countries ?? [];
  return (
    <section aria-labelledby="addresses-title" className="form-grid">
      <h2 className="h3" id="addresses-title">
        {t("addresses")}
      </h2>
      <AddressBook
        addresses={addresses.map((a) => ({ ...a, country: String(a.country) })) as SavedAddress[]}
        countries={countries}
      />
    </section>
  );
}
