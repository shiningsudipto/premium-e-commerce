"use client";

import "./globals.css";

// Last resort when the root layout itself fails, so no translations or theme are available.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-start justify-center gap-4 px-6">
        <h1 className="text-3xl tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground">We couldn&apos;t load the store. Please try again in a moment.</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Try again
        </button>
        {error.digest && <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>}
      </body>
    </html>
  );
}
