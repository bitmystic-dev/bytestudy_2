import type { ReactNode } from "react";

export function SectionHeader({
  title,
  action,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 mt-6 flex items-end justify-between gap-3 first:mt-0">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 text-xs text-muted-foreground">{action}</div>}
    </div>
  );
}
