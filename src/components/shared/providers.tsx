"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";
import { OfflineProvider } from "@/providers/OfflineProvider";
import { SWRegister } from "@/components/shared/SWRegister";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <OfflineProvider>
        <SWRegister />
        {children}
        <Toaster richColors position="top-right" />
      </OfflineProvider>
    </NextThemesProvider>
  );
}
