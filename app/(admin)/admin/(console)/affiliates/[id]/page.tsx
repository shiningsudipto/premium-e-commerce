import type { Metadata } from "next";
import { AffiliateDetailScreen } from "@/src/admin/features/affiliates/affiliate-detail";

export const metadata: Metadata = { title: "Affiliate" };

export default async function Page({ params }: PageProps<"/admin/affiliates/[id]">) {
  const { id } = await params;
  return <AffiliateDetailScreen id={id} />;
}
