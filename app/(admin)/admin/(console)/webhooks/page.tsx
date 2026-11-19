import type { Metadata } from "next";
import { Suspense } from "react";
import { WebhooksScreen } from "@/src/admin/features/webhooks/webhooks-screen";

export const metadata: Metadata = { title: "Webhooks" };

export default function Page() {
  return (
    <Suspense>
      <WebhooksScreen />
    </Suspense>
  );
}
