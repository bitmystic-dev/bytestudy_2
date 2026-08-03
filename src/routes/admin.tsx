import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  ExternalLink,
  Globe,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { useProfile } from "@/hooks/useCloud";

const ALLEN_URL = "https://www.allen.in/";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — BytePrep" },
      { name: "description", content: "Administrator dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [profile, , profileLoading] = useProfile();
  const navigate = useNavigate();

  // Client-side gate. Server functions and RLS policies also verify
  // admin_rights — this is strictly a UX shortcut.
  useEffect(() => {
    if (profileLoading) return;
    if (!profile || !profile.adminRights) {
      navigate({ to: "/", replace: true });
    }
  }, [profile, profileLoading, navigate]);

  if (profileLoading || !profile || !profile.adminRights) {
    return (
      <AppShell>
        <div className="mt-24 text-center text-sm text-muted-foreground">
          Checking access…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-6 flex items-center gap-3">
        <Link
          to="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-muted-foreground active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Tools visible only to you
          </p>
        </div>
        <div className="flex h-9 items-center gap-1.5 rounded-full bg-primary/15 px-3 text-[11px] font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Admin
        </div>
      </header>

      <SectionHeader
        title="ALLEN portal"
        subtitle="Opens allen.in inside BytePrep"
      />
      <AllenWebview />

      <SectionHeader title="More admin tools" subtitle="Coming soon" />
      <div className="card-surface flex items-center gap-3 p-4 opacity-70">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-elevated text-muted-foreground">
          <KeyRound className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">Data operations & content controls</div>
          <div className="text-[11px] text-muted-foreground">
            Additional admin tools will appear here.
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function AllenWebview() {
  const [key, setKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setLoaded(false);
    setBlocked(false);
    timer.current = window.setTimeout(() => {
      setBlocked((prev) => (loaded ? prev : true));
    }, 6000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center gap-2 border-b border-hairline px-3 py-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-elevated text-muted-foreground">
          <Globe className="h-4 w-4" />
        </div>
        <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
          allen.in
        </span>
        <button
          onClick={() => setKey((k) => k + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-muted-foreground active:scale-95"
          aria-label="Reload portal"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <a
          href={ALLEN_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-muted-foreground active:scale-95"
          aria-label="Open allen.in in a new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="relative h-[70vh] w-full bg-background">
        <iframe
          key={key}
          src={ALLEN_URL}
          title="ALLEN portal"
          onLoad={() => {
            setLoaded(true);
            setBlocked(false);
          }}
          className="h-full w-full border-0"
          referrerPolicy="no-referrer"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
        {!loaded && !blocked && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 text-xs text-muted-foreground">
            Loading allen.in…
          </div>
        )}
        {blocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
            <p className="text-sm font-medium">ALLEN blocked embedding</p>
            <p className="text-xs text-muted-foreground">
              The portal refuses to load inside an in-app browser. Open it in a
              new tab instead.
            </p>
            <a
              href={ALLEN_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground active:scale-[0.98]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open allen.in
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
