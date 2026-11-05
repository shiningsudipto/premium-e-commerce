import { notFound } from "next/navigation";

// Unknown storefront paths render the not-found page inside the shop chrome. The page always
// throws, so there's nothing for instant-navigation validation to check.
export const instant = false;

export default function UnknownPage() {
  notFound();
}
