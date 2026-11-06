import type { Metadata } from "next";
import { OrderDetailScreen } from "@/src/admin/features/orders/order-detail";

export const metadata: Metadata = { title: "Order" };

export default async function Page({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  return <OrderDetailScreen id={id} />;
}
