import type { Metadata } from "next";
import { Suspense } from "react";
import { RedirectsScreen } from "@/src/admin/features/redirects/redirects-screen";

export const metadata: Metadata = { title: "Redirects" };

export default function Page() {
  return (
    <Suspense>
      <RedirectsScreen />
    </Suspense>
  );
}
