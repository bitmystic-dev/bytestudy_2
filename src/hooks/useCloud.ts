import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getUserProfile, updateStudentProfile } from "@/lib/firebase-data";
import { useAuth } from "@/lib/auth-context";
import type { ChapterMeta, FocusSession, Mission, Priority, Profile, SubjectId } from "@/lib/types";
import type { CustomItem, CustomizationMap, SubjectCustomization } from "@/lib/chapters";
import { customizationKey } from "@/lib/chapters";

type Updater<T> = T | ((prev: T) => T);
type Setter<T> = (updater: Updater<T>) => void;
const resolve = <T,>(updater: Updater<T>, previous: T): T =>
  typeof updater === "function" ? (updater as (value: T) => T)(previous) : updater;

function millis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (typeof value === "string" || typeof value === "number") return new Date(value).getTime();
  return Date.now();
}

type ProfileState = { profile: Profile | null; loading: boolean; userId: string | null };
let profileState: ProfileState = { profile: null, loading: true, userId: null };
const profileListeners = new Set<() => void>();
function setProfileState(next: Partial<ProfileState>) {
  profileState = { ...profileState, ...next };
  profileListeners.forEach((listener) => listener());
}

function documentToProfile(data: Record<string, unknown>): Profile | null {
  const classLevel = data.classLevel;
  const targetYear = data.targetYear;
  if (typeof classLevel !== "string" || typeof targetYear !== "number") return null;
  return {
    name: typeof data.name === "string" ? data.name : "Student",
    exam: "JEE",
    classLevel: classLevel as Profile["classLevel"],
    targetYear,
    coaching: typeof data.coaching === "string" ? data.coaching : "",
    dailyGoalMinutes: typeof data.dailyGoalMinutes === "number" ? data.dailyGoalMinutes : 240,
    wakeTime: typeof data.wakeTime === "string" ? data.wakeTime : "06:30",
    sleepTime: typeof data.sleepTime === "string" ? data.sleepTime : "23:00",
    weeklyOffDay: typeof data.weeklyOffDay === "number" ? data.weeklyOffDay : 0,
    createdAt: millis(data.createdAt),
  };
}

function profileData(profile: Profile) {
  return {
    name: profile.name,
    classLevel: profile.classLevel,
    targetYear: profile.targetYear,
    coaching: profile.coaching,
    dailyGoalMinutes: profile.dailyGoalMinutes,
    wakeTime: profile.wakeTime,
    sleepTime: profile.sleepTime,
    weeklyOffDay: profile.weeklyOffDay,
  };
}

export function useProfile(): [Profile | null, Setter<Profile | null>, boolean] {
  const { user, status } = useAuth();
  const [, force] = useState(0);

  useEffect(() => {
    const listener = () => force((value) => value + 1);
    profileListeners.add(listener);
    return () => { profileListeners.delete(listener); };
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setProfileState({ profile: null, loading: status === "loading", userId: null });
      return;
    }
    if (profileState.userId === user.uid && !profileState.loading) return;
    let cancelled = false;
    setProfileState({ loading: true, userId: user.uid });
    getUserProfile(user.uid).then((data) => {
      if (!cancelled) setProfileState({ profile: data ? documentToProfile(data as Record<string, unknown>) : null, loading: false, userId: user.uid });
    }).catch((error: unknown) => {
      console.error("[profile] load", error);
      if (!cancelled) setProfileState({ profile: null, loading: false, userId: user.uid });
    });
    return () => { cancelled = true; };
  }, [status, user]);

  const set = useCallback<Setter<Profile | null>>((updater) => {
    if (!user) return;
    const next = resolve(updater, profileState.profile);
    setProfileState({ profile: next });
    if (next) void updateStudentProfile(user.uid, profileData(next));
  }, [user]);
  return [profileState.profile, set, profileState.loading];
}

interface MissionDocument { title?: string; subject?: SubjectId; chapterKey?: string; priority?: Priority; dueDate?: string; notes?: string; pinned?: boolean; completed?: boolean; completedAt?: unknown; createdAt?: unknown; }
function toMission(id: string, data: MissionDocument): Mission {
  return { id, title: data.title ?? "Mission", subject: data.subject ?? "physics", chapterKey: data.chapterKey, priority: data.priority ?? "medium", dueDate: data.dueDate, notes: data.notes, pinned: data.pinned ?? false, completed: data.completed ?? false, completedAt: data.completedAt ? millis(data.completedAt) : undefined, createdAt: millis(data.createdAt) };
}
function missionData(item: Mission) { return { title: item.title, subject: item.subject, chapterKey: item.chapterKey ?? null, priority: item.priority, dueDate: item.dueDate ?? null, notes: item.notes ?? null, pinned: item.pinned, completed: item.completed, completedAt: item.completedAt ?? null, createdAt: item.createdAt }; }

export function useMissions(): [Mission[], Setter<Mission[]>, boolean] {
  const { user, status } = useAuth();
  const [items, setItems] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (status !== "authenticated" || !user) { setItems([]); setLoading(status === "loading"); return; }
    let cancelled = false;
    setLoading(true);
    getDocs(query(collection(db, "users", user.uid, "missions"), orderBy("createdAt", "desc"))).then((snapshot) => {
      if (!cancelled) { setItems(snapshot.docs.map((item) => toMission(item.id, item.data() as MissionDocument))); setLoading(false); }
    }).catch((error: unknown) => { console.error("[missions] load", error); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, user]);
  const set = useCallback<Setter<Mission[]>>((updater) => {
    if (!user) return;
    setItems((previous) => {
      const next = resolve(updater, previous);
      const oldMap = new Map(previous.map((item) => [item.id, item]));
      const nextMap = new Map(next.map((item) => [item.id, item]));
      next.forEach((item) => { if (JSON.stringify(oldMap.get(item.id)) !== JSON.stringify(item)) void setDoc(doc(db, "users", user.uid, "missions", item.id), missionData(item), { merge: true }); });
      previous.forEach((item) => { if (!nextMap.has(item.id)) void deleteDoc(doc(db, "users", user.uid, "missions", item.id)); });
      return next;
    });
  }, [user]);
  return [items, set, loading];
}

interface SessionDocument { subject?: SubjectId; chapterKey?: string; startedAt?: unknown; endedAt?: unknown; durationSec?: number; mode?: "pomodoro" | "custom"; }
function toSession(id: string, data: SessionDocument): FocusSession { return { id, subject: data.subject, chapterKey: data.chapterKey, startedAt: millis(data.startedAt), endedAt: millis(data.endedAt), durationSec: data.durationSec ?? 0, mode: data.mode ?? "custom" }; }
function sessionData(item: FocusSession) { return { subject: item.subject ?? null, chapterKey: item.chapterKey ?? null, startedAt: item.startedAt, endedAt: item.endedAt, durationSec: item.durationSec, mode: item.mode }; }

export function useSessions(): [FocusSession[], Setter<FocusSession[]>, boolean] {
  const { user, status } = useAuth();
  const [items, setItems] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (status !== "authenticated" || !user) { setItems([]); setLoading(status === "loading"); return; }
    let cancelled = false;
    getDocs(query(collection(db, "users", user.uid, "focus_sessions"), orderBy("endedAt", "desc"))).then((snapshot) => { if (!cancelled) { setItems(snapshot.docs.map((item) => toSession(item.id, item.data() as SessionDocument))); setLoading(false); } }).catch((error: unknown) => { console.error("[sessions] load", error); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, user]);
  const set = useCallback<Setter<FocusSession[]>>((updater) => { if (!user) return; setItems((previous) => { const next = resolve(updater, previous); const ids = new Set(previous.map((item) => item.id)); next.forEach((item) => { if (!ids.has(item.id)) void setDoc(doc(db, "users", user.uid, "focus_sessions", item.id), sessionData(item)); }); return next; }); }, [user]);
  return [items, set, loading];
}

type MetaMap = Record<string, Partial<ChapterMeta>>;
function toMeta(data: Record<string, unknown>): Partial<ChapterMeta> { return { overrideName: typeof data.overrideName === "string" ? data.overrideName : undefined, completion: Number(data.completion ?? 0), revisionCount: Number(data.revisionCount ?? 0), notes: typeof data.notes === "string" ? data.notes : "", confidence: Number(data.confidence ?? 0) as ChapterMeta["confidence"], moduleProgress: Number(data.moduleProgress ?? 0), dppProgress: Number(data.dppProgress ?? 0), pyqProgress: Number(data.pyqProgress ?? 0), estimatedHours: Number(data.estimatedHours ?? 0), actualHours: Number(data.actualHours ?? 0), lastStudied: data.lastStudied ? millis(data.lastStudied) : undefined, nextRevision: data.nextRevision ? millis(data.nextRevision) : undefined, bookmarked: Boolean(data.bookmarked), pinned: Boolean(data.pinned), checkpoints: (data.checkpoints ?? {}) as ChapterMeta["checkpoints"] }; }

export function useChapterMeta(): [MetaMap, Setter<MetaMap>, boolean] {
  const { user, status } = useAuth(); const [map, setMap] = useState<MetaMap>({}); const [loading, setLoading] = useState(true);
  useEffect(() => { if (status !== "authenticated" || !user) { setMap({}); setLoading(status === "loading"); return; } let cancelled = false; getDocs(collection(db, "users", user.uid, "chapter_progress")).then((snapshot) => { if (!cancelled) { const next: MetaMap = {}; snapshot.docs.forEach((item) => { next[item.id] = toMeta(item.data()); }); setMap(next); setLoading(false); } }).catch((error: unknown) => { console.error("[chapter_progress] load", error); if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [status, user]);
  const set = useCallback<Setter<MetaMap>>((updater) => { if (!user) return; setMap((previous) => { const next = resolve(updater, previous); Object.keys(next).forEach((key) => { if (JSON.stringify(previous[key] ?? null) !== JSON.stringify(next[key] ?? null)) void setDoc(doc(db, "users", user.uid, "chapter_progress", key), next[key], { merge: true }); }); Object.keys(previous).forEach((key) => { if (!(key in next)) void deleteDoc(doc(db, "users", user.uid, "chapter_progress", key)); }); return next; }); }, [user]);
  return [map, set, loading];
}

export async function eraseAllUserData(userId: string) {
  const groups = ["missions", "focus_sessions", "chapter_progress", "chapter_customizations"];
  await Promise.all(groups.map(async (group) => { const snapshot = await getDocs(collection(db, "users", userId, group)); await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref))); }));
  await updateStudentProfile(userId, { name: "", classLevel: null, targetYear: null, coaching: "", dailyGoalMinutes: 240, wakeTime: "06:30", sleepTime: "23:00", weeklyOffDay: 0 });
  setProfileState({ profile: null });
}

export const EMPTY_META: MetaMap = {};
export const EMPTY_MISSIONS: Mission[] = [];
export const EMPTY_SESSIONS: FocusSession[] = [];

export function useChapterCustomizations(): [CustomizationMap, Setter<CustomizationMap>, boolean] {
  const { user, status } = useAuth(); const [map, setMap] = useState<CustomizationMap>({}); const [loading, setLoading] = useState(true);
  useEffect(() => { if (status !== "authenticated" || !user) { setMap({}); setLoading(status === "loading"); return; } let cancelled = false; getDocs(collection(db, "users", user.uid, "chapter_customizations")).then((snapshot) => { if (!cancelled) { const next: CustomizationMap = {}; snapshot.docs.forEach((item) => { const data = item.data(); next[item.id] = { items: Array.isArray(data.items) ? data.items as CustomItem[] : [] }; }); setMap(next); setLoading(false); } }).catch((error: unknown) => { console.error("[customizations] load", error); if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [status, user]);
  const set = useCallback<Setter<CustomizationMap>>((updater) => { if (!user) return; setMap((previous) => { const next = resolve(updater, previous); const keys = new Set([...Object.keys(previous), ...Object.keys(next)]); keys.forEach((key) => { const value = next[key]; if (!value) void deleteDoc(doc(db, "users", user.uid, "chapter_customizations", key)); else if (JSON.stringify(previous[key]) !== JSON.stringify(value)) void setDoc(doc(db, "users", user.uid, "chapter_customizations", key), value); }); return next; }); }, [user]);
  return [map, set, loading];
}