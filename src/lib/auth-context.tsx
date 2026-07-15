import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  updatePassword as fbUpdatePassword,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/integrations/firebase/client";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

// Compatibility shape: existing code reads `user.id`; Firebase exposes `uid`.
// We expose both so downstream consumers don't need to change in this turn.
export interface AuthUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  firebaseUser: FirebaseUser;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Legacy alias — some callers still read `session` truthiness. */
  session: { user: AuthUser } | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyError(err: unknown): string | undefined {
  if (!err) return undefined;
  const anyErr = err as { code?: string; message?: string };
  const code = anyErr.code ?? "";
  const msg = (anyErr.message ?? "").toLowerCase();
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/invalid-email":
      return "That email doesn't look right.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Please choose a stronger password (min 6 characters).";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a minute and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups and try again.";
    case "auth/network-request-failed":
      return "Network problem. Check your connection.";
    case "auth/requires-recent-login":
      return "Please sign in again to change your password.";
    default:
      if (msg.includes("network")) return "Network problem. Check your connection.";
      return anyErr.message || "Something went wrong.";
  }
}

function toAuthUser(u: FirebaseUser): AuthUser {
  return {
    id: u.uid,
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
    firebaseUser: u,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setUser(toAuthUser(fbUser));
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return {};
    } catch (e) {
      return { error: friendlyError(e) };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name && name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() }).catch(() => {});
      }
      return {};
    } catch (e) {
      return { error: friendlyError(e) };
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      return {};
    } catch (e) {
      return { error: friendlyError(e) };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;
      await sendPasswordResetEmail(auth, email, url ? { url } : undefined);
      return {};
    } catch (e) {
      return { error: friendlyError(e) };
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    try {
      if (!auth.currentUser) return { error: "You need to be signed in." };
      await fbUpdatePassword(auth.currentUser, password);
      return {};
    } catch (e) {
      return { error: friendlyError(e) };
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      session: user ? { user } : null,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      resetPassword,
      updatePassword,
    }),
    [status, user, signIn, signUp, signOut, signInWithGoogle, resetPassword, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
