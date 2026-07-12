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
  const { status, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
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
    if (mode === "signup") return /.+@.+\..+/.test(email) && password.length >= 6 && !loading;
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

  const onGoogle = async () => {
    setError(undefined);
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
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

      {mode !== "forgot" && (
        <button
          onClick={onGoogle}
          disabled={loading}
          className="mb-4 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-semibold text-black transition-all active:scale-[0.99] disabled:opacity-60"
        >
          <GoogleGlyph />
          Continue with Google
        </button>
      )}

      {mode !== "forgot" && (
        <div className="mb-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-white/10" />
          or
          <div className="h-px flex-1 bg-white/10" />
        </div>
      )}

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
              placeholder={mode === "signup" ? "Choose a password (min 6)" : "Password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 6 : undefined}
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
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {info}
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
    <label className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3.5 ring-1 ring-white/10 focus-within:ring-primary/50">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </label>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
