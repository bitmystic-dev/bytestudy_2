import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
  className?: string;
}

export function AppShell({ children, hideNav, className }: AppShellProps) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[480px] overflow-x-hidden">
      <main
        className={cn(
          "safe-top relative min-h-dvh px-5 pt-4",
          hideNav ? "pb-8" : "pb-[calc(6rem+env(safe-area-inset-bottom))]",
          className,
        )}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
