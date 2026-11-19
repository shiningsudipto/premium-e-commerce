import type { Metadata } from "next";
import { PayoutBatchScreen } from "@/src/admin/features/affiliate-ops/payout-batch-screen";

export const metadata: Metadata = { title: "Payout batch" };

export default async function Page({ params }: PageProps<"/admin/affiliates/payouts/[id]">) {
  const { id } = await params;
  return <PayoutBatchScreen id={id} />;
}
