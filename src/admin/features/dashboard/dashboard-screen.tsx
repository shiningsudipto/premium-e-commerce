"use client";

import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "../../components/can";
import { visibleNav } from "../../components/console-shell";

// Phase 0 home: who's signed in and where they can go. Live store numbers arrive with the
// dashboard summary screen in a later phase.
export function DashboardScreen() {
  const me = useMe();
  if (!me.data) return <Skeleton className="h-40 w-full max-w-3xl" />;
  const sections = visibleNav(me.data.permissions)
    .flatMap((s) => s.items)
    .filter((i) => i.href !== "/admin");
  return (
    <div className="max-w-4xl space-y-8">
      <div className="space-y-1">
        <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">Signed in</p>
        <h1 className="text-2xl font-medium tracking-tight">Hello, {me.data.name ?? me.data.email}</h1>
        <p className="text-sm text-muted-foreground">
          {me.data.roles.join(", ")} · two-step verification {me.data.mfaEnabled ? "on" : "off"}
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full items-start justify-between rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium">
                <Icon className="size-4 text-primary" aria-hidden />
                {label}
              </span>
              <ArrowUpRightIcon
                className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
