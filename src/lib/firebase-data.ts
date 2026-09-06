import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface UserProfileData {
  name?: string;
  email?: string;
  purchases?: string[];
  downloads?: boolean;
  createdAt?: Timestamp | null;
  classLevel?: string;
  targetYear?: number;
  coaching?: string;
  dailyGoalMinutes?: number;
  wakeTime?: string;
  sleepTime?: string;
  weeklyOffDay?: number;
}

export async function createUserProfile(uid: string, name: string, email: string) {
  await setDoc(doc(db, "users", uid), {
    name: name || "Student",
    email,
    purchases: [],
    downloads: false,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? (snapshot.data() as UserProfileData) : null;
}

export async function updateStudentProfile(uid: string, data: Record<string, unknown>) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

export async function updateStudentName(uid: string, name: string) {
  await updateDoc(doc(db, "users", uid), { name });
}

export function isEntitledToModule(purchases: unknown, moduleId: string) {
  return Array.isArray(purchases) && purchases.includes(moduleId);
}

export function hasDownloadPermission(profile: UserProfileData | null) {
  return profile?.downloads === true;
}

export interface LibraryCategory extends DocumentData {
  id: string;
  name?: string;
  title?: string;
  displayOrder?: number;
  description?: string;
}

export interface LibraryModule extends DocumentData {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  categoryId?: string;
  category?: string;
  status?: string;
  publishAt?: string | Timestamp | null;
  folderId?: string;
  driveFolderId?: string;
  thumbnailUrl?: string;
}

function publishTime(value: LibraryModule["publishAt"]): number | null {
  if (!value) return null;
  if (typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  const parsed = new Date(value as string).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export async function fetchLibraryContent() {
  const [categoriesSnapshot, modulesSnapshot] = await Promise.all([
    getDocs(query(collection(db, "course_categories"), orderBy("displayOrder", "asc"))),
    getDocs(query(collection(db, "course_modules"), where("status", "==", "published"))),
  ]);
  const now = Date.now();
  const categories = categoriesSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as LibraryCategory[];
  const modules = modulesSnapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as LibraryModule)
    .filter((item) => {
      const publishedAt = publishTime(item.publishAt);
      return publishedAt === null || publishedAt <= now;
    });
  return { categories, modules };
}

export async function deleteStudentRecord(uid: string, path: string, id: string) {
  await deleteDoc(doc(db, "users", uid, path, id));
}