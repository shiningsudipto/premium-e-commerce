"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "../store/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <TooltipProvider>
        {children}
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </StoreProvider>
  );
}
