import type { Metadata } from "next";
import { Suspense } from "react";
import { RolesScreen } from "@/src/admin/features/staff/roles-screen";

export const metadata: Metadata = { title: "Roles" };

export default function Page() {
  return (
    <Suspense>
      <RolesScreen />
    </Suspense>
  );
}
