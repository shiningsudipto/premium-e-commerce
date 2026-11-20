import type { Metadata } from "next";
import { guideContext } from "@/src/admin/features/guides/guide-context";
import { GuideView } from "@/src/admin/features/guides/guide-view";
import { apiKeysGuide } from "@/src/admin/features/guides/api-keys-guide";

export const metadata: Metadata = { title: "API keys guide" };

export default function Page() {
  return <GuideView guide={apiKeysGuide(guideContext())} />;
}
