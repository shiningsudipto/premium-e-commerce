import type { Metadata } from "next";
import { Suspense } from "react";
import { PromotionEditScreen } from "@/src/admin/features/promotions/promotion-editor";

export const metadata: Metadata = { title: "Promotion" };

// typed by hand: the generated route types only learn this route on the next `next dev`/typegen
async function Screen({ params }: Pick<PageProps<"/admin/promotions/[id]">, "params">) {
  const { id } = await params;
  return <PromotionEditScreen id={id} />;
}

export default function Page({ params }: PageProps<"/admin/promotions/[id]">) {
  return (
    <Suspense>
      <Screen params={params} />
    </Suspense>
  );
}
