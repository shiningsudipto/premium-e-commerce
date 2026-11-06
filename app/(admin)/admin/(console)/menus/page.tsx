import type { Metadata } from "next";
import { Suspense } from "react";
import { MenusScreen } from "@/src/admin/features/menus/menus-screen";

export const metadata: Metadata = { title: "Menus" };

export default function Page() {
  return (
    <Suspense>
      <MenusScreen />
    </Suspense>
  );
}
