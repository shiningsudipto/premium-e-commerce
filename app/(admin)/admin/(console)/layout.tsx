import { ConsoleShell } from "@/src/admin/components/console-shell";

// proxy.ts keeps signed-out visitors out; the shell loads the staff member's permissions itself.
export default function ConsoleLayout({ children }: LayoutProps<"/admin">) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
