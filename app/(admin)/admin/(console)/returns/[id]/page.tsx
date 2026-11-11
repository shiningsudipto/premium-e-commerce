import type { Metadata } from "next";
import { ReturnDetailScreen } from "@/src/admin/features/returns/return-detail";

export const metadata: Metadata = { title: "Return" };

export default async function Page({ params }: PageProps<"/admin/returns/[id]">) {
  const { id } = await params;
  return <ReturnDetailScreen id={id} />;
}
