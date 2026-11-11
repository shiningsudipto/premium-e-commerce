import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeScreen } from "@/src/admin/features/theme/theme-screen";

export const metadata: Metadata = { title: "Theme" };

export default function Page() {
  return (
    <Suspense>
      <ThemeScreen />
    </Suspense>
  );
}
