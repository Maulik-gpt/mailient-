"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../components/ui/theme-provider";
import { OfflineToast } from "../components/offline-toast";
import { Toaster } from "../components/ui/sonner";
import { DashboardSettingsProvider } from "../lib/DashboardSettingsContext";

const queryClient = new QueryClient();

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <SessionProvider>
          <DashboardSettingsProvider>
            {children}
            <OfflineToast />
            <Toaster />
          </DashboardSettingsProvider>
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
