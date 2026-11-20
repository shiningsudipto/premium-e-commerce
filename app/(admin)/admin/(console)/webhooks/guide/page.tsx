import type { Metadata } from "next";
import { guideContext } from "@/src/admin/features/guides/guide-context";
import { GuideView } from "@/src/admin/features/guides/guide-view";
import { webhooksGuide } from "@/src/admin/features/guides/webhooks-guide";

export const metadata: Metadata = { title: "Webhooks guide" };

export default function Page() {
  return <GuideView guide={webhooksGuide(guideContext())} />;
}
