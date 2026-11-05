import type { Metadata } from "next";
import { Suspense } from "react";
import { StaffScreen } from "@/src/admin/features/staff/staff-screen";

export const metadata: Metadata = { title: "Staff" };

export default function Page() {
  return (
    <Suspense>
      <StaffScreen />
    </Suspense>
  );
}
