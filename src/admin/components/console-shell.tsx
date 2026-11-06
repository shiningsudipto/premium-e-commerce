"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ContactIcon,
  CreditCardIcon,
  FlagIcon,
  FolderTreeIcon,
  HistoryIcon,
  LayersIcon,
  LayoutDashboardIcon,
  ListTreeIcon,
  LogOutIcon,
  MailIcon,
  MenuIcon,
  PackageIcon,
  PercentIcon,
  ReceiptIcon,
  ShieldIcon,
  SignpostIcon,
  SlidersHorizontalIcon,
  TruckIcon,
  UsersIcon,
  WarehouseIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { can } from "../lib/permissions";
import { usePostV1AdminSessionLogoutMutation } from "../store/api.generated";
import { useMe } from "./can";

type NavItem = { href: string; label: string; icon: typeof FlagIcon; permission?: string | string[] };

// Sections appear only for staff who hold the permission (spec §4). Later phases add theirs here.
export const NAV: { heading: string; items: NavItem[] }[] = [
  { heading: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon }] },
  {
    heading: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ReceiptIcon, permission: "orders.read" },
      { href: "/admin/customers", label: "Customers", icon: ContactIcon, permission: "customers.read" },
    ],
  },
  {
    heading: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: PackageIcon, permission: "products.read" },
      { href: "/admin/categories", label: "Categories", icon: FolderTreeIcon, permission: "products.read" },
      { href: "/admin/collections", label: "Collections", icon: LayersIcon, permission: "products.read" },
      { href: "/admin/inventory", label: "Inventory", icon: WarehouseIcon, permission: "inventory.read" },
    ],
  },
  {
    heading: "Content",
    items: [
      { href: "/admin/menus", label: "Menus", icon: ListTreeIcon, permission: "content.menus.write" },
      { href: "/admin/redirects", label: "Redirects", icon: SignpostIcon, permission: "redirects.write" },
      {
        href: "/admin/notifications",
        label: "Notifications",
        icon: MailIcon,
        // the template list checks either permission itself (copy editors may only reword)
        permission: ["notifications.templates.write", "notifications.copy.write"],
      },
    ],
  },
  {
    heading: "Configuration",
    items: [
      { href: "/admin/settings", label: "Settings", icon: SlidersHorizontalIcon, permission: "settings.read" },
      { href: "/admin/shipping", label: "Shipping", icon: TruckIcon, permission: "settings.read" },
      { href: "/admin/tax", label: "Tax", icon: PercentIcon, permission: "settings.read" },
      { href: "/admin/payments", label: "Payments", icon: CreditCardIcon, permission: "settings.read" },
      { href: "/admin/flags", label: "Feature flags", icon: FlagIcon, permission: "settings.read" },
    ],
  },
  {
    heading: "Team",
    items: [
      { href: "/admin/staff", label: "Staff", icon: UsersIcon, permission: "staff.read" },
      { href: "/admin/roles", label: "Roles", icon: ShieldIcon, permission: "staff.read" },
      { href: "/admin/audit", label: "Audit log", icon: HistoryIcon, permission: ["audit.read", "audit.read_own"] },
    ],
  },
];

export function visibleNav(permissions: readonly string[] | undefined) {
  return NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.permission || can(permissions, item.permission)),
  })).filter((section) => section.items.length > 0);
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const me = useMe();
  if (me.isLoading) {
    return (
      <div className="space-y-2 px-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="bg-sidebar-accent h-7" />
        ))}
      </div>
    );
  }
  return (
    <nav aria-label="Main" className="space-y-6 px-3">
      {visibleNav(me.data?.permissions).map((section) => (
        <div key={section.heading} className="space-y-1">
          <p className="text-sidebar-foreground/50 px-2 font-mono text-[10px] tracking-[0.2em] uppercase">
            {section.heading}
          </p>
          {section.items.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-accent-foreground flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors"
              >
                <Icon className="size-4 opacity-80" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-baseline gap-2 px-5 py-5">
      <span className="text-sidebar-accent-foreground text-base font-semibold tracking-tight">Premium EC</span>
      <span className="text-sidebar-primary font-mono text-[10px] tracking-[0.2em] uppercase">Admin</span>
    </Link>
  );
}

function UserMenu() {
  const me = useMe();
  const [logout] = usePostV1AdminSessionLogoutMutation();
  async function signOut() {
    // the API revokes the session and clears its cookies
    await logout({}).catch(() => undefined);
    // a full load drops every cached query of the signed-out user
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.assign("/admin/login");
  }
  if (!me.data) return <Skeleton className="h-8 w-32" />;
  const initials = (me.data.name ?? me.data.email).slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="gap-2 px-1.5" aria-label="Account menu">
            <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {initials}
            </span>
            <span className="hidden max-w-48 truncate text-sm sm:inline">{me.data.name ?? me.data.email}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5">
            <span className="block truncate text-sm text-foreground">{me.data.email}</span>
            <span className="block truncate text-xs font-normal">{me.data.roles.join(", ")}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOutIcon aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex min-h-dvh">
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <aside className="bg-sidebar sticky top-0 hidden h-dvh w-60 shrink-0 flex-col lg:flex">
        <Brand />
        <SidebarNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                  <MenuIcon />
                </Button>
              }
            />
            <SheetContent side="left" className="bg-sidebar text-sidebar-foreground w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <SidebarNav onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>
        <main id="content" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// Page title row used by every console screen.
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
