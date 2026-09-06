import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/change-password")({
  head: () => ({
    meta: [
      { title: "Change password — BytePrep" },
      {
        name: "description",
        content: "Update the password you use to sign in to BytePrep.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = password.length > 0 && password === confirm && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const { error: err } = await updatePassword(password);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
    setPassword("");
    setConfirm("");
    window.setTimeout(() => navigate({ to: "/settings" }), 1200);
  };

  return (
    <AppShell hideNav>
      <header className="mb-6 flex items-center gap-3">
        <Link
          to="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Change password</h1>
      </header>

      <div className="card-surface p-4">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-elevated text-muted-foreground">
            <KeyRound className="h-4 w-4" />
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Pick anything you'll remember. There are no complexity rules.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              className="h-12 w-full rounded-2xl bg-input px-4 pr-12 text-[15px] outline-none ring-1 ring-hairline focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="h-12 w-full rounded-2xl bg-input px-4 text-[15px] outline-none ring-1 ring-hairline focus:ring-2 focus:ring-ring"
          />

          {confirm.length > 0 && confirm !== password && (
            <p className="text-[12px] text-destructive">Passwords don't match.</p>
          )}
          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
              {error}
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 rounded-2xl border border-success/25 bg-success/10 px-4 py-3 text-[13px] text-success">
              <CheckCircle2 className="h-4 w-4" />
              Password updated.
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="h-12 w-full rounded-full bg-primary text-[15px] font-semibold text-primary-foreground transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
