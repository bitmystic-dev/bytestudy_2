import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Save,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { useProfile, useAllenCredentials, useAllenSyncState } from "@/hooks/useCloud";
import { allenTestConnection, allenSyncNow } from "@/lib/allen.functions";
import { cn } from "@/lib/utils";

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

  // Client-side gate. Server functions also verify admin_rights so this is
  // strictly a UX shortcut — a non-admin who navigates here directly gets
  // bounced by both this component AND by the RLS policies on the tables.
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
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-muted-foreground active:scale-95"
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

      <SectionHeader title="Integrations" />
      <AllenIntegration />

      <SectionHeader title="More admin tools" subtitle="Coming soon" />
      <div className="card-surface flex items-center gap-3 p-4 opacity-70">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-muted-foreground">
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

// ---------- ALLEN Integration card ----------

function AllenIntegration() {
  const [creds, saveCreds, credsLoading] = useAllenCredentials();
  const [syncState, refreshSync] = useAllenSyncState();
  const testConn = useServerFn(allenTestConnection);
  const runSync = useServerFn(allenSyncNow);

  const [formId, setFormId] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<null | "test" | "sync">(null);
  const [toast, setToast] = useState<{
    kind: "ok" | "err";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (creds) {
      setFormId(creds.formId);
      setPassword(creds.password);
    }
  }, [creds]);

  const save = async () => {
    if (!formId.trim() || !password.trim()) return;
    setSaving(true);
    setToast(null);
    try {
      await saveCreds({ formId: formId.trim(), password: password.trim() });
      setToast({ kind: "ok", message: "Credentials saved." });
    } catch (e) {
      setToast({
        kind: "err",
        message: e instanceof Error ? e.message : "Failed to save.",
      });
    } finally {
      setSaving(false);
    }
  };

  const doTest = async () => {
    setBusy("test");
    setToast(null);
    try {
      const res = await testConn();
      setToast({
        kind: res.ok ? "ok" : "err",
        message: res.message,
      });
    } catch (e) {
      setToast({
        kind: "err",
        message: e instanceof Error ? e.message : "Test failed.",
      });
    } finally {
      setBusy(null);
    }
  };

  const doSync = async () => {
    setBusy("sync");
    setToast(null);
    try {
      const res = await runSync();
      await refreshSync();
      setToast({
        kind: res.ok ? "ok" : "err",
        message: res.ok
          ? `Sync complete · ${res.homeworkAdded} homework · ${res.testsAdded} tests`
          : res.error ?? "Sync failed.",
      });
    } catch (e) {
      setToast({
        kind: "err",
        message: e instanceof Error ? e.message : "Sync failed.",
      });
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!confirm("Remove your ALLEN credentials?")) return;
    setSaving(true);
    try {
      await saveCreds(null);
      setFormId("");
      setPassword("");
      setToast({ kind: "ok", message: "ALLEN disconnected." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-start gap-3 border-b border-white/5 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20">
          <KeyRound className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">ALLEN Integration</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Sync homework & tests from your ALLEN student portal.
          </div>
        </div>
        <div
          className={cn(
            "flex h-6 items-center rounded-full px-2.5 text-[10px] font-medium",
            creds ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-muted-foreground",
          )}
        >
          {creds ? "Connected" : "Not connected"}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <FormField label="Form ID">
          <input
            value={formId}
            onChange={(e) => setFormId(e.target.value)}
            placeholder="e.g. 24AAAA0001"
            autoCapitalize="characters"
            className="w-full bg-transparent text-[15px] outline-none"
          />
        </FormField>
        <FormField label="Password (usually DDMMYYYY)">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ddmmyyyy"
            type="text"
            className="w-full bg-transparent font-mono text-[15px] outline-none tracking-wider"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={save}
            disabled={saving || !formId.trim() || !password.trim() || credsLoading}
            className={cn(
              "flex h-11 items-center justify-center gap-1.5 rounded-2xl text-[13px] font-semibold transition-colors",
              saving || !formId.trim() || !password.trim()
                ? "bg-white/5 text-muted-foreground"
                : "bg-primary text-primary-foreground active:scale-[0.99]",
            )}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : creds ? "Update" : "Save"}
          </button>
          <button
            onClick={doTest}
            disabled={!creds || busy !== null}
            className={cn(
              "flex h-11 items-center justify-center gap-1.5 rounded-2xl text-[13px] font-semibold ring-1 ring-white/10 transition-colors",
              !creds || busy
                ? "bg-white/[0.03] text-muted-foreground"
                : "bg-white/[0.06] text-foreground active:scale-[0.99]",
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {busy === "test" ? "Testing…" : "Test"}
          </button>
        </div>

        {creds && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={doSync}
              disabled={busy !== null}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-2xl text-[13px] font-semibold transition-colors",
                busy
                  ? "bg-white/5 text-muted-foreground"
                  : "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20 active:scale-[0.99]",
              )}
            >
              <RefreshCw className={cn("h-4 w-4", busy === "sync" && "animate-spin")} />
              {busy === "sync" ? "Syncing…" : "Sync now"}
            </button>
            <button
              onClick={disconnect}
              disabled={saving}
              className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-destructive/10 text-[13px] font-semibold text-destructive active:scale-[0.99]"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        )}

        {toast && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-2xl border p-3 text-[12.5px]",
              toast.kind === "ok"
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                : "border-rose-400/20 bg-rose-500/10 text-rose-200",
            )}
          >
            {toast.kind === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="leading-relaxed">{toast.message}</span>
          </div>
        )}

        <div className="mt-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11.5px] leading-relaxed text-muted-foreground">
          <div className="font-medium text-foreground">How this works</div>
          <p className="mt-1">
            BytePrep tries to authenticate with ALLEN using the credentials you save
            here, then pulls new homework and test schedules on demand. Homework becomes
            missions; tests appear in the Test Schedule Tracker. Duplicates are avoided
            using a stable ALLEN identifier per item.
          </p>
          {syncState.lastSyncAt && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Last sync ·{" "}
              {new Date(syncState.lastSyncAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              · {syncState.lastStatus}
              {syncState.lastError ? ` · ${syncState.lastError}` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-2xl bg-white/[0.04] px-4 py-2.5 ring-1 ring-white/10 focus-within:ring-primary/40">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </label>
  );
}
