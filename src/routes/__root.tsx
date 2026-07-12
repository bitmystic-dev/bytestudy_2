import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { useStore } from "@/hooks/useStore";
import { KEYS } from "@/lib/storage";
import type { Profile } from "@/lib/types";

function NotFoundComponent() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold tracking-tight">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again in a moment.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#1a1c22" },
      { title: "BytePrep — Calm study companion for JEE" },
      {
        name: "description",
        content:
          "A distraction-free study tracker built for JEE aspirants. Plan chapters, run focus sessions, and watch real progress compound.",
      },
      { property: "og:title", content: "BytePrep" },
      { property: "og:description", content: "Calm study companion for JEE aspirants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function OnboardingGate() {
  const [profile] = useStore<Profile | null>(KEYS.profile, null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!profile && pathname !== "/onboarding") {
      navigate({ to: "/onboarding", replace: true });
    } else if (profile && pathname === "/onboarding") {
      navigate({ to: "/", replace: true });
    }
  }, [profile, pathname, navigate]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <OnboardingGate />
      <Outlet />
    </QueryClientProvider>
  );
}
