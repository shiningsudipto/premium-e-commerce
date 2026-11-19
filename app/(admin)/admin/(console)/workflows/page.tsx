import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkflowsScreen } from "@/src/admin/features/workflows/workflows-screen";

export const metadata: Metadata = { title: "Workflows" };

export default function Page() {
  return (
    <Suspense>
      <WorkflowsScreen />
    </Suspense>
  );
}
