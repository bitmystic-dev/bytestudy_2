import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type {
  AiPersonalization,
  ChapterMeta,
  FocusSession,
  Mission,
  Priority,
  Profile,
  SubjectId,
  Test,
  TestStatus,
} from "@/lib/types";


// ============================================================
// Cloud-backed data hooks. Each hook returns `[value, setValue]`
// with the same signature as the previous localStorage-backed
// `useStore` API, so page code needs only a hook-swap.
// The setter is optimistic: it updates local state immediately,
// then diffs old vs new to persist changes to Supabase.
// ============================================================

type Updater<T> = T | ((prev: T) => T);
type Setter<T> = (u: Updater<T>) => void;

function resolve<T>(u: Updater<T>, prev: T): T {
  return typeof u === "function" ? (u as (p: T) => T)(prev) : u;
}

// ---------- PROFILE ----------

function rowToProfile(row: {
  name: string;
  exam: string;
  class_level: string | null;
  target_year: number | null;
  coaching: string;
  daily_goal_minutes: number;
  wake_time: string;
  sleep_time: string;
  weekly_off_day: number;
  onboarded: boolean;
  created_at: string;
  institute_tests_pattern?: string | null;
  admin_rights?: boolean | null;
}): Profile | null {
  if (!row.onboarded || !row.class_level || !row.target_year) return null;
  return {
    name: row.name,
    exam: "JEE",
    classLevel: row.class_level as Profile["classLevel"],
    targetYear: row.target_year,
    coaching: row.coaching,
    dailyGoalMinutes: row.daily_goal_minutes,
    wakeTime: row.wake_time,
    sleepTime: row.sleep_time,
    weeklyOffDay: row.weekly_off_day,
    createdAt: new Date(row.created_at).getTime(),
    instituteTestsPattern: row.institute_tests_pattern ?? "",
    adminRights: row.admin_rights ?? false,
  };
}

function profileToRow(p: Profile) {
  return {
    name: p.name,
    exam: p.exam,
    class_level: p.classLevel,
    target_year: p.targetYear,
    coaching: p.coaching,
    daily_goal_minutes: p.dailyGoalMinutes,
    wake_time: p.wakeTime,
    sleep_time: p.sleepTime,
    weekly_off_day: p.weeklyOffDay,
    onboarded: true,
    institute_tests_pattern: p.instituteTestsPattern ?? "",
  };
}


// Shared module-level store so every useProfile() consumer sees the same
// state — otherwise onboarding's local setProfile does not update the
// AuthRouter's copy, and it redirects back to /onboarding on finish.
type ProfileState = { profile: Profile | null; loading: boolean; userId: string | null };
let profileState: ProfileState = { profile: null, loading: true, userId: null };
const profileListeners = new Set<() => void>();
function setProfileState(next: Partial<ProfileState>) {
  profileState = { ...profileState, ...next };
  profileListeners.forEach((l) => l());
}

export function useProfile(): [Profile | null, Setter<Profile | null>, boolean] {
  const { user, status } = useAuth();
  const [, force] = useState(0);

  useEffect(() => {
    const l = () => force((n) => n + 1);
    profileListeners.add(l);
    return () => {
      profileListeners.delete(l);
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setProfileState({ profile: null, loading: status === "loading", userId: null });
      return;
    }
    // Skip re-fetch if we already have this user's profile loaded.
    if (profileState.userId === user.id && !profileState.loading) return;
    let cancelled = false;
    setProfileState({ loading: true, userId: user.id });
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("[profile] load", error);
        setProfileState({
          profile: data ? rowToProfile(data) : null,
          loading: false,
          userId: user.id,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [user, status]);

  const set: Setter<Profile | null> = useCallback(
    (updater) => {
      if (!user) return;
      const next = resolve(updater, profileState.profile);
      setProfileState({ profile: next });
      if (next) {
        supabase
          .from("profiles")
          .upsert({ user_id: user.id, ...profileToRow(next) })
          .then(({ error }) => {
            if (error) console.error("[profile] save", error);
          });
      }
    },
    [user],
  );

  return [profileState.profile, set, profileState.loading];
}

// ---------- MISSIONS ----------

interface MissionRow {
  id: string;
  title: string;
  subject: SubjectId;
  chapter_key: string | null;
  priority: Priority;
  due_date: string | null;
  notes: string | null;
  pinned: boolean;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

function rowToMission(r: MissionRow): Mission {
  return {
    id: r.id,
    title: r.title,
    subject: r.subject,
    chapterKey: r.chapter_key ?? undefined,
    priority: r.priority,
    dueDate: r.due_date ?? undefined,
    notes: r.notes ?? undefined,
    pinned: r.pinned,
    completed: r.completed,
    completedAt: r.completed_at ? new Date(r.completed_at).getTime() : undefined,
    createdAt: new Date(r.created_at).getTime(),
  };
}

function missionToRow(m: Mission, userId: string) {
  return {
    id: m.id,
    user_id: userId,
    title: m.title,
    subject: m.subject,
    chapter_key: m.chapterKey ?? null,
    priority: m.priority,
    due_date: m.dueDate ?? null,
    notes: m.notes ?? null,
    pinned: m.pinned,
    completed: m.completed,
    completed_at: m.completedAt ? new Date(m.completedAt).toISOString() : null,
    created_at: new Date(m.createdAt).toISOString(),
  };
}

export function useMissions(): [Mission[], Setter<Mission[]>, boolean] {
  const { user, status } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const prevRef = useRef<Mission[]>([]);

  useEffect(() => {
    prevRef.current = missions;
  }, [missions]);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setMissions([]);
      prevRef.current = [];
      setLoading(status === "loading");
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("missions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("[missions] load", error);
        const list = (data ?? []).map((r) => rowToMission(r as MissionRow));
        setMissions(list);
        prevRef.current = list;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, status]);

  const set: Setter<Mission[]> = useCallback(
    (updater) => {
      if (!user) return;
      setMissions((prev) => {
        const next = resolve(updater, prev);
        const prevMap = new Map(prev.map((m) => [m.id, m]));
        const nextMap = new Map(next.map((m) => [m.id, m]));
        const toInsert: Mission[] = [];
        const toUpdate: Mission[] = [];
        const toDelete: string[] = [];
        for (const m of next) {
          const old = prevMap.get(m.id);
          if (!old) toInsert.push(m);
          else if (JSON.stringify(old) !== JSON.stringify(m)) toUpdate.push(m);
        }
        for (const m of prev) if (!nextMap.has(m.id)) toDelete.push(m.id);

        for (const m of toInsert) {
          supabase
            .from("missions")
            .insert(missionToRow(m, user.id))
            .then(({ error }) => error && console.error("[missions] insert", error));
        }
        for (const m of toUpdate) {
          const row = missionToRow(m, user.id);
          const { user_id: _u, id: _id, created_at: _c, ...patch } = row;
          void _u;
          void _id;
          void _c;
          supabase
            .from("missions")
            .update(patch)
            .eq("id", m.id)
            .eq("user_id", user.id)
            .then(({ error }) => error && console.error("[missions] update", error));
        }
        if (toDelete.length) {
          supabase
            .from("missions")
            .delete()
            .in("id", toDelete)
            .eq("user_id", user.id)
            .then(({ error }) => error && console.error("[missions] delete", error));
        }
        return next;
      });
    },
    [user],
  );

  return [missions, set, loading];
}

// ---------- FOCUS SESSIONS ----------

interface SessionRow {
  id: string;
  subject: SubjectId | null;
  chapter_key: string | null;
  started_at: string;
  ended_at: string;
  duration_sec: number;
  mode: "pomodoro" | "custom";
}

function rowToSession(r: SessionRow): FocusSession {
  return {
    id: r.id,
    subject: r.subject ?? undefined,
    chapterKey: r.chapter_key ?? undefined,
    startedAt: new Date(r.started_at).getTime(),
    endedAt: new Date(r.ended_at).getTime(),
    durationSec: r.duration_sec,
    mode: r.mode,
  };
}

function sessionToRow(s: FocusSession, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    subject: s.subject ?? null,
    chapter_key: s.chapterKey ?? null,
    started_at: new Date(s.startedAt).toISOString(),
    ended_at: new Date(s.endedAt).toISOString(),
    duration_sec: s.durationSec,
    mode: s.mode,
  };
}

export function useSessions(): [FocusSession[], Setter<FocusSession[]>, boolean] {
  const { user, status } = useAuth();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setSessions([]);
      setLoading(status === "loading");
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("ended_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("[sessions] load", error);
        setSessions((data ?? []).map((r) => rowToSession(r as SessionRow)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, status]);

  const set: Setter<FocusSession[]> = useCallback(
    (updater) => {
      if (!user) return;
      setSessions((prev) => {
        const next = resolve(updater, prev);
        const prevIds = new Set(prev.map((s) => s.id));
        for (const s of next) {
          if (!prevIds.has(s.id)) {
            supabase
              .from("focus_sessions")
              .insert(sessionToRow(s, user.id))
              .then(({ error }) => error && console.error("[sessions] insert", error));
          }
        }
        return next;
      });
    },
    [user],
  );

  return [sessions, set, loading];
}

// ---------- CHAPTER META ----------

interface ChapterMetaRow {
  chapter_key: string;
  override_name: string | null;
  completion: number;
  revision_count: number;
  notes: string;
  confidence: number;
  module_progress: number;
  dpp_progress: number;
  pyq_progress: number;
  estimated_hours: number;
  actual_hours: number;
  last_studied: string | null;
  next_revision: string | null;
  bookmarked: boolean;
  pinned: boolean;
  checkpoints: Record<string, boolean> | null;
}

function rowToMeta(r: ChapterMetaRow): Partial<ChapterMeta> {
  return {
    overrideName: r.override_name ?? undefined,
    completion: Number(r.completion),
    revisionCount: r.revision_count,
    notes: r.notes,
    confidence: r.confidence as ChapterMeta["confidence"],
    moduleProgress: Number(r.module_progress),
    dppProgress: Number(r.dpp_progress),
    pyqProgress: Number(r.pyq_progress),
    estimatedHours: Number(r.estimated_hours),
    actualHours: Number(r.actual_hours),
    lastStudied: r.last_studied ? new Date(r.last_studied).getTime() : undefined,
    nextRevision: r.next_revision ? new Date(r.next_revision).getTime() : undefined,
    bookmarked: r.bookmarked,
    pinned: r.pinned,
    checkpoints: (r.checkpoints ?? {}) as ChapterMeta["checkpoints"],
  };
}

function metaToRow(key: string, m: Partial<ChapterMeta>, userId: string) {
  return {
    user_id: userId,
    chapter_key: key,
    override_name: m.overrideName ?? null,
    completion: m.completion ?? 0,
    revision_count: m.revisionCount ?? 0,
    notes: m.notes ?? "",
    confidence: m.confidence ?? 0,
    module_progress: m.moduleProgress ?? 0,
    dpp_progress: m.dppProgress ?? 0,
    pyq_progress: m.pyqProgress ?? 0,
    estimated_hours: m.estimatedHours ?? 0,
    actual_hours: m.actualHours ?? 0,
    last_studied: m.lastStudied ? new Date(m.lastStudied).toISOString() : null,
    next_revision: m.nextRevision ? new Date(m.nextRevision).toISOString() : null,
    bookmarked: m.bookmarked ?? false,
    pinned: m.pinned ?? false,
    checkpoints: m.checkpoints ?? {},
  };
}


type MetaMap = Record<string, Partial<ChapterMeta>>;

export function useChapterMeta(): [MetaMap, Setter<MetaMap>, boolean] {
  const { user, status } = useAuth();
  const [metaMap, setMetaMap] = useState<MetaMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setMetaMap({});
      setLoading(status === "loading");
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("chapter_meta")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("[chapter_meta] load", error);
        const map: MetaMap = {};
        for (const r of (data ?? []) as ChapterMetaRow[]) {
          map[r.chapter_key] = rowToMeta(r);
        }
        setMetaMap(map);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, status]);

  const set: Setter<MetaMap> = useCallback(
    (updater) => {
      if (!user) return;
      setMetaMap((prev) => {
        const next = resolve(updater, prev);
        const toUpsert: string[] = [];
        const toDelete: string[] = [];
        for (const k of Object.keys(next)) {
          if (JSON.stringify(prev[k] ?? null) !== JSON.stringify(next[k] ?? null)) {
            toUpsert.push(k);
          }
        }
        for (const k of Object.keys(prev)) {
          if (!(k in next)) toDelete.push(k);
        }
        for (const k of toUpsert) {
          supabase
            .from("chapter_meta")
            .upsert(metaToRow(k, next[k], user.id))
            .then(({ error }) => error && console.error("[chapter_meta] upsert", error));
        }
        if (toDelete.length) {
          supabase
            .from("chapter_meta")
            .delete()
            .in("chapter_key", toDelete)
            .eq("user_id", user.id)
            .then(({ error }) => error && console.error("[chapter_meta] delete", error));
        }
        return next;
      });
    },
    [user],
  );

  return [metaMap, set, loading];
}

// ---------- Utility: clear all cloud data (danger zone) ----------

export async function eraseAllUserData(userId: string) {
  await Promise.all([
    supabase.from("missions").delete().eq("user_id", userId),
    supabase.from("focus_sessions").delete().eq("user_id", userId),
    supabase.from("chapter_meta").delete().eq("user_id", userId),
    supabase.from("chapter_customizations").delete().eq("user_id", userId),
    supabase
      .from("profiles")
      .update({ onboarded: false, class_level: null, target_year: null, name: "" })
      .eq("user_id", userId),
  ]);
}

// Stable empty defaults for pages that want reference equality.
export const EMPTY_META: MetaMap = {};
export const EMPTY_MISSIONS: Mission[] = [];
export const EMPTY_SESSIONS: FocusSession[] = [];

// ---------- CHAPTER CUSTOMIZATIONS (custom chapter lists per subject) ----------

import type { CustomItem, CustomizationMap, SubjectCustomization } from "@/lib/chapters";
import { customizationKey } from "@/lib/chapters";

interface CustomizationRow {
  class_level: number;
  subject: SubjectId;
  items: CustomItem[];
}

export function useChapterCustomizations(): [
  CustomizationMap,
  Setter<CustomizationMap>,
  boolean,
] {
  const { user, status } = useAuth();
  const [map, setMap] = useState<CustomizationMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setMap({});
      setLoading(status === "loading");
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("chapter_customizations")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("[chapter_customizations] load", error);
        const next: CustomizationMap = {};
        for (const r of (data ?? []) as unknown as CustomizationRow[]) {
          const cls = r.class_level as 11 | 12;
          next[customizationKey(cls, r.subject)] = {
            items: Array.isArray(r.items) ? (r.items as CustomItem[]) : [],
          };
        }
        setMap(next);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, status]);

  const set: Setter<CustomizationMap> = useCallback(
    (updater) => {
      if (!user) return;
      setMap((prev) => {
        const next = resolve(updater, prev);
        const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
        for (const k of allKeys) {
          const before: SubjectCustomization | undefined = prev[k];
          const after: SubjectCustomization | undefined = next[k];
          if (JSON.stringify(before ?? null) === JSON.stringify(after ?? null)) continue;
          const [clsStr, subject] = k.split(":");
          const cls = Number(clsStr) as 11 | 12;
          if (!after) {
            supabase
              .from("chapter_customizations")
              .delete()
              .eq("user_id", user.id)
              .eq("class_level", cls)
              .eq("subject", subject)
              .then(({ error }) => error && console.error("[custom] delete", error));
          } else {
            supabase
              .from("chapter_customizations")
              .upsert({
                user_id: user.id,
                class_level: cls,
                subject,
                items: after.items as unknown as import("@/integrations/supabase/types").Json,
              })
              .then(({ error }) => error && console.error("[custom] upsert", error));
          }
        }
        return next;
      });
    },
    [user],
  );

  return [map, set, loading];
}

// ---------- TESTS (institute test schedule) ----------

interface TestRow {
  id: string;
  name: string;
  test_date: string;
  subjects: string[];
  syllabus: string;
  status: string;
  score: number | null;
  max_score: number | null;
  notes: string;
  source: string;
  created_at: string;
  updated_at: string;
}

function rowToTest(r: TestRow): Test {
  return {
    id: r.id,
    name: r.name,
    testDate: r.test_date,
    subjects: r.subjects as SubjectId[],
    syllabus: r.syllabus,
    status: (r.status as TestStatus) ?? "upcoming",
    score: r.score ?? undefined,
    maxScore: r.max_score ?? undefined,
    notes: r.notes,
    source: (r.source as Test["source"]) ?? "manual",
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

function testToRow(t: Test, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    name: t.name,
    test_date: t.testDate,
    subjects: t.subjects,
    syllabus: t.syllabus,
    status: t.status,
    score: t.score ?? null,
    max_score: t.maxScore ?? null,
    notes: t.notes,
    source: t.source,
  };
}

export function useTests(): [Test[], Setter<Test[]>, boolean] {
  const { user, status } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setTests([]);
      setLoading(status === "loading");
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("tests")
      .select("*")
      .eq("user_id", user.id)
      .order("test_date", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("[tests] load", error);
        setTests((data ?? []).map((r) => rowToTest(r as TestRow)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, status]);

  const set: Setter<Test[]> = useCallback(
    (updater) => {
      if (!user) return;
      setTests((prev) => {
        const next = resolve(updater, prev);
        const prevMap = new Map(prev.map((t) => [t.id, t]));
        const nextMap = new Map(next.map((t) => [t.id, t]));
        const toInsert: Test[] = [];
        const toUpdate: Test[] = [];
        const toDelete: string[] = [];
        for (const t of next) {
          const old = prevMap.get(t.id);
          if (!old) toInsert.push(t);
          else if (JSON.stringify(old) !== JSON.stringify(t)) toUpdate.push(t);
        }
        for (const t of prev) if (!nextMap.has(t.id)) toDelete.push(t.id);

        for (const t of toInsert) {
          supabase
            .from("tests")
            .insert(testToRow(t, user.id))
            .then(({ error }) => error && console.error("[tests] insert", error));
        }
        for (const t of toUpdate) {
          const row = testToRow(t, user.id);
          const { user_id: _u, id: _id, ...patch } = row;
          void _u;
          void _id;
          supabase
            .from("tests")
            .update(patch)
            .eq("id", t.id)
            .eq("user_id", user.id)
            .then(({ error }) => error && console.error("[tests] update", error));
        }
        if (toDelete.length) {
          supabase
            .from("tests")
            .delete()
            .in("id", toDelete)
            .eq("user_id", user.id)
            .then(({ error }) => error && console.error("[tests] delete", error));
        }
        return next;
      });
    },
    [user],
  );

  return [tests, set, loading];
}
