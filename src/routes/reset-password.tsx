import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ByteStudy" },
      { name: "description", content: "Set a new password for your ByteStudy account." },
      { property: "og:title", content: "Reset password — ByteStudy" },
      { property: "og:description", content: "Set a new password for your ByteStudy account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setReady(Boolean(user)));
  }, []);

  const canSubmit = ready && password.length > 0 && password === confirm && !loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(undefined);
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) return setError(error);
    setDone(true);
    setTimeout(() => navigate({ to: "/", replace: true }), 1500);
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
            ? "Redirecting you in a moment…"
             : "Choose a password you can remember."}
        </p>
      </div>

      {!done && (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            required
            disabled={!ready}
            className="w-full rounded-2xl bg-elevated px-5 py-4 text-[15px] outline-none ring-1 ring-hairline placeholder:text-muted-foreground focus:ring-primary/50 disabled:opacity-50"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            required
            disabled={!ready}
            className="w-full rounded-2xl bg-elevated px-5 py-4 text-[15px] outline-none ring-1 ring-hairline placeholder:text-muted-foreground focus:ring-primary/50 disabled:opacity-50"
          />

          {!ready && (
            <p className="text-center text-xs text-muted-foreground">
              Waiting for the reset link to authenticate…
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
              canSubmit ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground",
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
