import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User, UserCredential } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile } from "@/lib/firebase-data";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  session: User | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyError(err: Error | null | undefined): string | undefined {
  if (!err) return undefined;
  const msg = err.message?.toLowerCase() ?? "";
  if (msg.includes("invalid credential") || msg.includes("wrong-password")) return "Wrong email or password.";
  if (msg.includes("email not confirmed")) return "Please confirm your email first.";
  if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("already-in-use")) {
    return "An account with this email already exists.";
  }
  if (msg.includes("password") && msg.includes("weak"))
    return "Please choose a stronger password.";
  if (msg.includes("password") && msg.includes("short")) return "Password must be at least 6 characters.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Network problem. Check your connection.";
  if (msg.includes("rate limit"))
    return "Too many attempts. Please wait a minute and try again.";
  if (msg.includes("weak-password")) return "Password must be at least 6 characters.";
  return err.message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!mounted) return;
      setSession(user);
      setStatus(user ? "authenticated" : "unauthenticated");
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try { await signInWithEmailAndPassword(auth, email, password); return {}; }
    catch (error) { return { error: friendlyError(error as Error) }; }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    try {
      const credential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (name?.trim()) await updateProfile(credential.user, { displayName: name.trim() });
      await createUserProfile(credential.user.uid, name?.trim() || "Student", email);
      return {};
    } catch (error) { return { error: friendlyError(error as Error) }; }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try { await sendPasswordResetEmail(auth, email); return {}; }
    catch (error) { return { error: friendlyError(error as Error) }; }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    try {
      if (!auth.currentUser) return { error: "No user is currently signed in." };
      await firebaseUpdatePassword(auth.currentUser, password);
      return {};
    } catch (error) { return { error: friendlyError(error as Error) }; }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      session,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [status, session, signIn, signUp, signOut, resetPassword, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
