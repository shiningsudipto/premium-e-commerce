import type { Metadata } from "next";
import { CustomerDetailScreen } from "@/src/admin/features/customers/customer-detail";

export const metadata: Metadata = { title: "Customer" };

export default async function Page({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  return <CustomerDetailScreen id={id} />;
}
