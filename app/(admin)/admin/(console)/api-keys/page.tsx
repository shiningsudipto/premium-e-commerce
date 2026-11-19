import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiKeysScreen } from "@/src/admin/features/api-keys/api-keys-screen";

export const metadata: Metadata = { title: "API keys" };

export default function Page() {
  return (
    <Suspense>
      <ApiKeysScreen />
    </Suspense>
  );
}
