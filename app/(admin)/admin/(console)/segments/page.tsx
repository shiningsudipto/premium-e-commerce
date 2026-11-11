import type { Metadata } from "next";
import { Suspense } from "react";
import { SegmentsScreen } from "@/src/admin/features/segments/segments-screen";

export const metadata: Metadata = { title: "Segments" };

export default function Page() {
  return (
    <Suspense>
      <SegmentsScreen />
    </Suspense>
  );
}
