"use client";

import { createContext, useContext, type ReactNode } from "react";

const FlagsContext = createContext<Record<string, boolean>>({});

// Client components read the market's flags from here; server components use isEnabled().
export function FlagsProvider({ flags, children }: { flags: Record<string, boolean>; children: ReactNode }) {
  return <FlagsContext value={flags}>{children}</FlagsContext>;
}

export function useFlag(key: string): boolean {
  return useContext(FlagsContext)[key] === true;
}
