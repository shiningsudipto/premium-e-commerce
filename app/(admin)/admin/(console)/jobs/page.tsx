import type { Metadata } from "next";
import { Suspense } from "react";
import { JobsScreen } from "@/src/admin/features/jobs/jobs-screen";

export const metadata: Metadata = { title: "Jobs" };

export default function Page() {
  return (
    <Suspense>
      <JobsScreen />
    </Suspense>
  );
}
