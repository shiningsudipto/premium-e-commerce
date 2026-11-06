import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationsScreen } from "@/src/admin/features/notifications/notifications-screen";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <Suspense>
      <NotificationsScreen />
    </Suspense>
  );
}
