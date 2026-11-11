import type { Metadata } from "next";
import { Suspense } from "react";
import { PagesScreen } from "@/src/admin/features/pages/pages-screen";

export const metadata: Metadata = { title: "Pages" };

export default function Page() {
  return (
    <Suspense>
      <PagesScreen />
    </Suspense>
  );
}
