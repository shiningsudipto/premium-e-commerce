import type { Metadata } from "next";
import { Suspense } from "react";
import { FlagsScreen } from "@/src/admin/features/flags/flags-screen";

export const metadata: Metadata = { title: "Feature flags" };

export default function Page() {
  return (
    <Suspense>
      <FlagsScreen />
    </Suspense>
  );
}
