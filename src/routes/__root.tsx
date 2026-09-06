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
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { useProfile } from "@/hooks/useCloud";
import { ThemeProvider, themeBootstrapScript, DEFAULT_PREFS } from "@/lib/theme";

const PUBLIC_ROUTES = new Set(["/", "/auth", "/reset-password"]);

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
    console.error(error);
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
      { title: "ByteStudy — Calm study companion for JEE" },
      {
        name: "description",
        content:
          "A distraction-free study tracker built for JEE aspirants. Plan chapters, run focus sessions, and watch real progress compound.",
      },
      { property: "og:title", content: "ByteStudy" },
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
    <html
      lang="en"
      data-theme={DEFAULT_PREFS.theme}
      data-accent={DEFAULT_PREFS.accent}
      data-radius={DEFAULT_PREFS.radius}
      style={{ colorScheme: DEFAULT_PREFS.mode === "dark" ? "dark" : "light" }}
    >
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthRouter() {
  const { status } = useAuth();
  const [profile, , profileLoading] = useProfile();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isPublic = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      if (!isPublic) navigate({ to: "/", replace: true });
      return;
    }

    // authenticated
    if (pathname === "/auth") {
      navigate({ to: "/", replace: true });
      return;
    }

    if (profileLoading) return;

    if (!profile && pathname !== "/onboarding" && pathname !== "/reset-password") {
      navigate({ to: "/onboarding", replace: true });
    } else if (profile && pathname === "/onboarding") {
      navigate({ to: "/", replace: true });
    }
  }, [status, profile, profileLoading, pathname, isPublic, navigate]);

  // Splash while resolving initial session, but let public routes render immediately.
  if (status === "loading" && !isPublic) return <SplashScreen />;
  if (status === "authenticated" && profileLoading && pathname !== "/onboarding" && !isPublic) {
    return <SplashScreen />;
  }
  return <Outlet />;
}

function SplashScreen() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] items-center justify-center px-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
          ByteStudy
        </span>
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AuthRouter />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
