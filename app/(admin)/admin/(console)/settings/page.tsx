import type { Metadata } from "next";
import { PageHeader } from "@/src/admin/components/console-shell";
import { SettingsScreen } from "@/src/admin/features/settings/settings-screen";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Store-wide behaviour. A value can be set for all markets and channels, or for one of them where the setting allows it."
      />
      <SettingsScreen />
    </>
  );
}
