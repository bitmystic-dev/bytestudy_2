import { Link, useLocation } from "@tanstack/react-router";
import { Home, ListTodo, Timer, Sparkles, User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useCloud";

const BASE_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/planner", label: "Planner", icon: ListTodo },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/ai", label: "AI", icon: Sparkles },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const [profile] = useProfile();
  const isAdmin = !!profile?.adminRights;
  const items = isAdmin
    ? ([
        ...BASE_ITEMS,
        { to: "/admin" as const, label: "Admin", icon: ShieldCheck },
      ] as const)
    : BASE_ITEMS;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[480px] justify-center pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <nav
        className="glass-nav pointer-events-auto mx-3 flex flex-1 items-stretch justify-between rounded-full px-1.5 py-1.5"
        aria-label="Primary"
      >
        {items.map(({ to, label, icon: Icon }) => {
          const active =
            to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 text-[10px] font-medium transition-all duration-200",
                active ? "text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-primary shadow-lg shadow-primary/25 transition-all duration-300"
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
                <span
                  className={cn(
                    "leading-none transition-opacity",
                    active ? "opacity-100" : "opacity-90",
                  )}
                >
                  {label}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
