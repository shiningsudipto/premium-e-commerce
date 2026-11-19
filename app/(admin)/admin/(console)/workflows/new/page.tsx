import type { Metadata } from "next";
import { Suspense } from "react";
import { NewWorkflowScreen } from "@/src/admin/features/workflows/workflow-editor";

export const metadata: Metadata = { title: "New workflow rule" };

export default function Page() {
  return (
    <Suspense>
      <NewWorkflowScreen />
    </Suspense>
  );
}
