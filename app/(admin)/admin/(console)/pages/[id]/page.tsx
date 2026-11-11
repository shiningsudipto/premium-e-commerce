import type { Metadata } from "next";
import { Suspense } from "react";
import { PageEditorScreen } from "@/src/admin/features/pages/page-editor";

export const metadata: Metadata = { title: "Page builder" };

export default async function Page({ params }: PageProps<"/admin/pages/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <PageEditorScreen id={id} />
    </Suspense>
  );
}
