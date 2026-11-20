import type { Metadata } from "next";
import { Suspense } from "react";
import { NewsletterScreen } from "@/src/admin/features/newsletter/newsletter-screen";

export const metadata: Metadata = { title: "Newsletter" };

export default function Page() {
  return (
    <Suspense>
      <NewsletterScreen />
    </Suspense>
  );
}
