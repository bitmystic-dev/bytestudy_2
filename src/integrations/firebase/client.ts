// Firebase Web SDK client. Public API key — safe to commit.
// Used for Auth + Firestore from browser code.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyALoqxKgpu2LI4vUYWvrn51wEpz5Px7Rr4",
  authDomain: "byteprep-daaf1.firebaseapp.com",
  projectId: "byteprep-daaf1",
  storageBucket: "byteprep-daaf1.firebasestorage.app",
  messagingSenderId: "700732248327",
  appId: "1:700732248327:web:c5e133d9cc72c8b37935a2",
};

export const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);

// Fire-and-forget persistence config; safe if already set.
if (typeof window !== "undefined") {
  void setPersistence(auth, browserLocalPersistence).catch(() => {});
}
