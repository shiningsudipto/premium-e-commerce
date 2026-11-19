import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkflowEditScreen } from "@/src/admin/features/workflows/workflow-editor";

export const metadata: Metadata = { title: "Workflow rule" };

async function Screen({ params }: Pick<PageProps<"/admin/workflows/[id]">, "params">) {
  const { id } = await params;
  return <WorkflowEditScreen id={id} />;
}

export default function Page({ params }: PageProps<"/admin/workflows/[id]">) {
  return (
    <Suspense>
      <Screen params={params} />
    </Suspense>
  );
}
