import type { Metadata } from "next";
import { Suspense } from "react";
import { AssetsScreen } from "@/src/admin/features/affiliate-ops/assets-screen";

export const metadata: Metadata = { title: "Marketing assets" };

export default function Page() {
  return (
    <Suspense>
      <AssetsScreen />
    </Suspense>
  );
}
