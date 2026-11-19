import type { Metadata } from "next";
import { Suspense } from "react";
import { IntegrationsScreen } from "@/src/admin/features/integrations/integrations-screen";

export const metadata: Metadata = { title: "Integrations" };

export default function Page() {
  return (
    <Suspense>
      <IntegrationsScreen />
    </Suspense>
  );
}
