import type { Metadata } from "next";
import { guideContext } from "@/src/admin/features/guides/guide-context";
import { GuideView } from "@/src/admin/features/guides/guide-view";
import { workflowsGuide } from "@/src/admin/features/guides/workflows-guide";

export const metadata: Metadata = { title: "Workflows guide" };

export default function Page() {
  return <GuideView guide={workflowsGuide(guideContext())} />;
}
