import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { Providers } from "@/src/admin/components/providers";
import "./admin.css";

const sans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Premium EC Admin", template: "%s · Premium EC Admin" },
  robots: { index: false, follow: false },
};

// Every admin page belongs to a signed-in staff member, so nothing below is prerendered: the
// Redux store (which generates request IDs with Math.random) is created per request and per tab.
async function RequestTime({ children }: { children: ReactNode }) {
  await connection();
  return <Providers>{children}</Providers>;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full">
        <Suspense>
          <RequestTime>{children}</RequestTime>
        </Suspense>
      </body>
    </html>
  );
}
