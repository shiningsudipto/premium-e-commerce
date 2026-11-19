import type { Metadata } from "next";
import { Suspense } from "react";
import { TranslationEditorScreen } from "@/src/admin/features/translations/translation-editor";

export const metadata: Metadata = { title: "Translate" };

async function Screen({ params }: Pick<PageProps<"/admin/translations/[entityType]/[entityId]">, "params">) {
  const { entityType, entityId } = await params;
  return <TranslationEditorScreen entityType={entityType} entityId={entityId} />;
}

export default function Page({ params }: PageProps<"/admin/translations/[entityType]/[entityId]">) {
  return (
    <Suspense>
      <Screen params={params} />
    </Suspense>
  );
}
