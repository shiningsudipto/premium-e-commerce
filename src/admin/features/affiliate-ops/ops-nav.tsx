import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const LINKS = [
  { key: "fraud", href: "/admin/affiliates/fraud", label: "Fraud review" },
  { key: "payouts", href: "/admin/affiliates/payouts", label: "Payout batches" },
  { key: "assets", href: "/admin/affiliates/assets", label: "Marketing assets" },
] as const;

// Header links between the affiliate operations screens.
export function AffiliateOpsNav({ current }: { current: (typeof LINKS)[number]["key"] }) {
  return (
    <nav aria-label="Affiliate operations" className="flex flex-wrap gap-2">
      <Link href="/admin/affiliates" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeftIcon data-icon="inline-start" /> Affiliates
      </Link>
      {LINKS.filter((l) => l.key !== current).map((l) => (
        <Link key={l.key} href={l.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
