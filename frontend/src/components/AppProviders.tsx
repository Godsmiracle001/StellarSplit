import type { ReactNode } from "react";
import { ThemeProvider } from "./ThemeContext";
import { WalletProvider } from "../hooks/use-wallet";
import { CollaborationProvider } from "./Collaboration";
import InstallPrompt from "./InstallPrompt";
import { NotificationsSync } from "./NotificationsSync";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WalletProvider>
        <CollaborationProvider>
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
          <InstallPrompt />
          <NotificationsSync />
          {children}
        </CollaborationProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
