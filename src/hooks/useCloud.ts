import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type {
  ChapterMeta,
  FocusSession,
  Mission,
  Priority,
  Profile,
  SubjectId,
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
  };
}

export function useProfile(): [Profile | null, Setter<Profile | null>, boolean] {
  const { user, status } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setProfile(null);
      setLoading(status === "loading");
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("[profile] load", error);
        setProfile(data ? rowToProfile(data) : null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, status]);

  const set: Setter<Profile | null> = useCallback(
    (updater) => {
      if (!user) return;
      setProfile((prev) => {
        const next = resolve(updater, prev);
        if (next) {
          supabase
            .from("profiles")
            .upsert({ user_id: user.id, ...profileToRow(next) })
            .then(({ error }) => {
              if (error) console.error("[profile] save", error);
            });
        }
        return next;
      });
    },
    [user],
  );

  return [profile, set, loading];
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
