import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "@/components/AppHeader"; // Reusing the updated minimal header

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background" suppressHydrationWarning>
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-x-hidden flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
