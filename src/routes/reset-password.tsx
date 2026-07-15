import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — BytePrep" },
      { name: "description", content: "Set a new password for your BytePrep account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();

  const oobCode = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("oobCode");
  }, []);

  const [ready, setReady] = useState(false);
  const [verifyError, setVerifyError] = useState<string | undefined>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setVerifyError("This reset link is missing its code. Request a new one.");
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then(() => setReady(true))
      .catch(() => setVerifyError("This reset link is invalid or has expired."));
  }, [oobCode]);

  const canSubmit =
    ready && oobCode && password.length >= 6 && password === confirm && !loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !oobCode) return;
    setError(undefined);
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setDone(true);
      setTimeout(() => navigate({ to: "/auth", replace: true }), 1500);
    } catch (err) {
      const anyErr = err as { code?: string; message?: string };
      if (anyErr.code === "auth/weak-password") {
        setError("Please choose a stronger password.");
      } else {
        setError(anyErr.message ?? "Couldn't update password. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
          {done ? <CheckCircle2 className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {done ? "Password updated" : "Set a new password"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {done
            ? "Redirecting you to sign in…"
            : "Choose a password you can remember. Minimum 6 characters."}
        </p>
      </div>

      {verifyError && !done && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {verifyError}
        </div>
      )}

      {!done && !verifyError && (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            minLength={6}
            required
            disabled={!ready}
            className="w-full rounded-2xl bg-white/[0.04] px-5 py-4 text-[15px] outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/50 disabled:opacity-50"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            minLength={6}
            required
            disabled={!ready}
            className="w-full rounded-2xl bg-white/[0.04] px-5 py-4 text-[15px] outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/50 disabled:opacity-50"
          />

          {!ready && (
            <p className="text-center text-xs text-muted-foreground">
              Verifying reset link…
            </p>
          )}
          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-all active:scale-[0.99]",
              canSubmit ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground",
            )}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Update password <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
