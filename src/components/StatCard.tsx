import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card-surface p-4", className)}>
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
