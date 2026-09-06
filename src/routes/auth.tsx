import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, ArrowRight, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — BytePrep" },
      { name: "description", content: "Sign in or create your BytePrep account." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const { status, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [info, setInfo] = useState<string | undefined>();

  useEffect(() => {
    if (status === "authenticated") navigate({ to: "/", replace: true });
  }, [status, navigate]);

  const canSubmit = (() => {
    if (mode === "forgot") return /.+@.+\..+/.test(email) && !loading;
    if (mode === "signup") return /.+@.+\..+/.test(email) && password.length >= 1 && !loading;
    return /.+@.+\..+/.test(email) && password.length >= 1 && !loading;
  })();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(undefined);
    setInfo(undefined);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) setError(error);
        // Note: `remember` — Supabase persists the session in localStorage regardless.
        // We use the flag to inform the user; opting out could clear session on tab close
        // by moving to sessionStorage, but that requires re-initializing the client.
        void remember;
      } else if (mode === "signup") {
        const { error } = await signUp(email, password, name.trim() || undefined);
        if (error) setError(error);
        else setInfo("Account created. You're signed in.");
      } else {
        const { error } = await resetPassword(email);
        if (error) setError(error);
        else setInfo("If that email exists, a reset link is on its way.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {mode === "forgot"
            ? "Reset password"
            : mode === "signup"
              ? "Create your account"
              : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "forgot"
            ? "We'll email you a secure reset link."
            : mode === "signup"
              ? "Start compounding your study progress."
              : "Sign in to continue your JEE prep."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "signup" && (
          <Field icon={<Sparkles className="h-4 w-4" />}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              autoComplete="name"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </Field>
        )}
        <Field icon={<Mail className="h-4 w-4" />}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </Field>
        {mode !== "forgot" && (
          <Field icon={<Lock className="h-4 w-4" />}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Choose a password" : "Password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </Field>
        )}

        {mode === "signin" && (
          <div className="flex items-center justify-between px-1 text-[12px]">
            <label className="flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(undefined);
                setInfo(undefined);
              }}
              className="text-primary/90 active:text-primary"
            >
              Forgot password?
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
            {info}
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
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "forgot" ? (
          <button
            onClick={() => {
              setMode("signin");
              setError(undefined);
              setInfo(undefined);
            }}
            className="inline-flex items-center gap-1 text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </button>
        ) : mode === "signin" ? (
          <>
            No account?{" "}
            <button
              onClick={() => {
                setMode("signup");
                setError(undefined);
                setInfo(undefined);
              }}
              className="font-medium text-primary"
            >
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              onClick={() => {
                setMode("signin");
                setError(undefined);
                setInfo(undefined);
              }}
              className="font-medium text-primary"
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-elevated px-4 py-3.5 ring-1 ring-hairline focus-within:ring-primary/50">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </label>
  );
}
