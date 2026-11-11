import type { Metadata } from "next";
import { Suspense } from "react";
import { ReturnsScreen } from "@/src/admin/features/returns/returns-screen";

export const metadata: Metadata = { title: "Returns" };

export default function Page() {
  return (
    <Suspense>
      <ReturnsScreen />
    </Suspense>
  );
}
