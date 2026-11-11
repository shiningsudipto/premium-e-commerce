import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsScreen } from "@/src/admin/features/reviews/reviews-screen";

export const metadata: Metadata = { title: "Reviews & Q&A" };

export default function Page() {
  return (
    <Suspense>
      <ReviewsScreen />
    </Suspense>
  );
}
