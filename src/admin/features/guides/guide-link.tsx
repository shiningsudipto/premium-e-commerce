import Link from "next/link";
import { BookOpenIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

// "Guide" button in a screen's header, opening that feature's guide page.
export function GuideLink({ href }: { href: string }) {
  return (
    <Link href={href} className={buttonVariants({ size: "sm", variant: "outline" })}>
      <BookOpenIcon /> Guide
    </Link>
  );
}
