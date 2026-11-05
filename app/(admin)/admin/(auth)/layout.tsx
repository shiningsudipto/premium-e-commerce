// Sign-in screens: a quiet panel on the left, the form on the right.
export default function AuthLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="bg-sidebar text-sidebar-foreground relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between">
        <p className="text-sidebar-primary font-mono text-xs tracking-[0.25em] uppercase">Premium EC · Back office</p>
        <div className="space-y-4">
          <p className="text-sidebar-accent-foreground max-w-sm text-3xl leading-tight font-medium">
            Run the store with a clear head.
          </p>
          <p className="text-sidebar-foreground/70 max-w-sm text-sm">
            Every change is permission-checked and written to the audit log.
          </p>
        </div>
        {/* ledger lines: a nod to the paper the business started on */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(0deg,currentColor_0_1px,transparent_1px_28px)] opacity-[0.07]"
        />
      </aside>
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
