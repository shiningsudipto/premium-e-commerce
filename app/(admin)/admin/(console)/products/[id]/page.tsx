import type { Metadata } from "next";
import { ProductEditScreen } from "@/src/admin/features/products/product-editor";

export const metadata: Metadata = { title: "Product" };

export default async function Page({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  return <ProductEditScreen id={id} />;
}
