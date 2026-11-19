import type { Metadata } from "next";
import { Suspense } from "react";
import { TranslationsScreen } from "@/src/admin/features/translations/translations-screen";

export const metadata: Metadata = { title: "Translations" };

export default function Page() {
  return (
    <Suspense>
      <TranslationsScreen />
    </Suspense>
  );
}
