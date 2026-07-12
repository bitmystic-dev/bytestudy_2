import { Link, useLocation } from "@tanstack/react-router";
import { Home, ListTodo, Timer, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/planner", label: "Planner", icon: ListTodo },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="glass-nav fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[480px] items-stretch justify-between rounded-t-3xl px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2"
      aria-label="Primary"
    >
      {items.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "group relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground active:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-12 items-center justify-center rounded-full transition-all",
                active ? "bg-white/10 text-primary" : "text-current",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
            </span>
            <span className="leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
