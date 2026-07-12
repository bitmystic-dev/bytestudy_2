import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyError(err: AuthError | Error | null | undefined): string | undefined {
  if (!err) return undefined;
  const msg = err.message?.toLowerCase() ?? "";
  if (msg.includes("invalid login")) return "Wrong email or password.";
  if (msg.includes("email not confirmed")) return "Please confirm your email first.";
  if (msg.includes("already registered") || msg.includes("already exists")) {
    return "An account with this email already exists.";
  }
  if (msg.includes("password") && msg.includes("weak"))
    return "Please choose a stronger password.";
  if (msg.includes("password") && msg.includes("short"))
    return "Password must be at least 6 characters.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Network problem. Check your connection.";
  if (msg.includes("rate limit"))
    return "Too many attempts. Please wait a minute and try again.";
  if (msg.includes("pwned") || msg.includes("compromised"))
    return "This password has appeared in data breaches. Choose another.";
  return err.message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let mounted = true;
    // Register listener BEFORE reading session per Supabase best practice.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setStatus(s ? "authenticated" : "unauthenticated");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setStatus(data.session ? "authenticated" : "unauthenticated");
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: friendlyError(error) };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
        data: name ? { name } : undefined,
      },
    });
    return { error: friendlyError(error) };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri:
          typeof window !== "undefined" ? window.location.origin : undefined,
      });
      if (result.error) {
        return { error: friendlyError(result.error as Error) };
      }
      return {};
    } catch (e) {
      return { error: friendlyError(e as Error) };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: friendlyError(error) };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: friendlyError(error) };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      session,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      resetPassword,
      updatePassword,
    }),
    [status, session, signIn, signUp, signOut, signInWithGoogle, resetPassword, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
