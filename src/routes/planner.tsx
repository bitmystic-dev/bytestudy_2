import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, ListTodo, X, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { MissionCard } from "@/components/MissionCard";
import { EmptyState } from "@/components/EmptyState";
import { useStore } from "@/hooks/useStore";
import { KEYS } from "@/lib/storage";
import type { ChapterMeta, Mission, Priority, Profile, SubjectId } from "@/lib/types";
import { SUBJECT_META } from "@/lib/types";
import { chapterDisplayName, getChaptersForProfile } from "@/lib/chapters";
import { uid } from "@/lib/format";
import { cn } from "@/lib/utils";

const EMPTY_MISSIONS: Mission[] = [];
const EMPTY_META: Record<string, Partial<ChapterMeta>> = {};

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner — BytePrep" },
      { name: "description", content: "Plan chapters, set priorities, and track missions." },
    ],
  }),
  component: PlannerPage,
});

type FilterId = "all" | "today" | "pending" | "done" | SubjectId;

function PlannerPage() {
  const [profile] = useStore<Profile | null>(KEYS.profile, null);
  const [missions, setMissions] = useStore<Mission[]>(KEYS.missions, EMPTY_MISSIONS);
  const [metaMap] = useStore<Record<string, Partial<ChapterMeta>>>(KEYS.chapterMeta, EMPTY_META);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  const chapters = useMemo(() => (profile ? getChaptersForProfile(profile.classLevel) : []), [profile]);

  const filtered = useMemo(() => {
    let list = [...missions];
    if (q.trim()) {
      const ql = q.toLowerCase();
      list = list.filter((m) => m.title.toLowerCase().includes(ql));
    }
    switch (filter) {
      case "pending":
        list = list.filter((m) => !m.completed);
        break;
      case "done":
        list = list.filter((m) => m.completed);
        break;
      case "today": {
        const today = new Date().toISOString().slice(0, 10);
        list = list.filter((m) => m.dueDate === today);
        break;
      }
      case "physics":
      case "chemistry":
      case "mathematics":
        list = list.filter((m) => m.subject === filter);
        break;
    }
    // Sort: pinned first, then priority (high→low), then due date, then created desc
    const pri: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    list.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.priority !== b.priority) return pri[a.priority] - pri[b.priority];
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (ad !== bd) return ad - bd;
      return b.createdAt - a.createdAt;
    });
    return list;
  }, [missions, q, filter]);

  const filters: { id: FilterId; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "today", label: "Today" },
    { id: "physics", label: "Physics" },
    { id: "chemistry", label: "Chemistry" },
    { id: "mathematics", label: "Maths" },
    { id: "done", label: "Done" },
  ];

  return (
    <AppShell>
      <header className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planner</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {missions.filter((m) => !m.completed).length} active ·{" "}
            {missions.filter((m) => m.completed).length} done
          </p>
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95"
          aria-label="New mission"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {/* Search */}
      <label className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search missions"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {q && (
          <button onClick={() => setQ("")} aria-label="Clear">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </label>

      {/* Filters */}
      <div className="-mx-5 mt-3 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                filter === f.id
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="mt-5 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState
            icon={q ? Search : ListTodo}
            title={q ? "No matches" : "No missions yet"}
            description={
              q ? "Try a different search term." : "Add a mission to plan your next chapter."
            }
          />
        ) : (
          filtered.map((m) => {
            const cRef = chapters.find((c) => c.key === m.chapterKey);
            return (
              <MissionCard
                key={m.id}
                mission={m}
                chapterName={cRef ? chapterDisplayName(cRef, metaMap) : undefined}
                onToggle={() =>
                  setMissions((prev) =>
                    prev.map((x) =>
                      x.id === m.id
                        ? {
                            ...x,
                            completed: !x.completed,
                            completedAt: !x.completed ? Date.now() : undefined,
                          }
                        : x,
                    ),
                  )
                }
                onPin={() =>
                  setMissions((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !x.pinned } : x)))
                }
                onClick={() => setEditMission(m)}
              />
            );
          })
        )}
      </div>

      {sheetOpen && (
        <MissionSheet
          onClose={() => setSheetOpen(false)}
          onSave={(m) => {
            setMissions((prev) => [m, ...prev]);
            setSheetOpen(false);
          }}
          profileLevel={profile?.classLevel}
        />
      )}

      <EditWrapper missions={missions} setMissions={setMissions} />
    </AppShell>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function setEditMission(_m: Mission) {
    // handled in child hook wrapper via URL state? simpler: emit custom event
    window.dispatchEvent(new CustomEvent("byteprep:edit-mission", { detail: _m }));
  }
}

function EditWrapper({
  missions,
  setMissions,
}: {
  missions: Mission[];
  setMissions: (u: (p: Mission[]) => Mission[]) => void;
}) {
  const [profile] = useStore<Profile | null>(KEYS.profile, null);
  const [editing, setEditing] = useState<Mission | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const m = (e as CustomEvent<Mission>).detail;
      setEditing(missions.find((x) => x.id === m.id) ?? m);
    };
    window.addEventListener("byteprep:edit-mission", handler);
    return () => window.removeEventListener("byteprep:edit-mission", handler);
  }, [missions]);

  if (!editing) return null;
  return (
    <MissionSheet
      mission={editing}
      profileLevel={profile?.classLevel}
      onClose={() => setEditing(null)}
      onDelete={() => {
        setMissions((prev) => prev.filter((x) => x.id !== editing.id));
        setEditing(null);
      }}
      onSave={(m) => {
        setMissions((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        setEditing(null);
      }}
    />
  );
}

function MissionSheet({
  mission,
  onClose,
  onSave,
  onDelete,
  profileLevel,
}: {
  mission?: Mission;
  onClose: () => void;
  onSave: (m: Mission) => void;
  onDelete?: () => void;
  profileLevel?: Profile["classLevel"];
}) {
  const [metaMap] = useStore<Record<string, Partial<ChapterMeta>>>(KEYS.chapterMeta, EMPTY_META);
  const chapters = useMemo(() => (profileLevel ? getChaptersForProfile(profileLevel) : []), [profileLevel]);

  const [title, setTitle] = useState(mission?.title ?? "");
  const [subject, setSubject] = useState<SubjectId>(mission?.subject ?? "physics");
  const [chapterKey, setChapterKey] = useState<string | undefined>(mission?.chapterKey);
  const [priority, setPriority] = useState<Priority>(mission?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(mission?.dueDate ?? "");
  const [notes, setNotes] = useState(mission?.notes ?? "");

  const subjectChapters = chapters.filter((c) => c.subject === subject);

  const canSave = title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const m: Mission = {
      id: mission?.id ?? uid(),
      title: title.trim(),
      subject,
      chapterKey,
      priority,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
      pinned: mission?.pinned ?? false,
      completed: mission?.completed ?? false,
      completedAt: mission?.completedAt,
      createdAt: mission?.createdAt ?? Date.now(),
    };
    onSave(m);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto w-full max-w-[480px] rounded-t-3xl bg-[var(--surface)] p-5 pb-[max(env(safe-area-inset-bottom),1rem)] ring-1 ring-white/10 animate-in slide-in-from-bottom">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            {mission ? "Edit mission" : "New mission"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mission title"
            className="w-full rounded-2xl bg-white/[0.04] px-4 py-3.5 text-[15px] outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/50"
          />

          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Subject</div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SUBJECT_META) as SubjectId[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSubject(s);
                    setChapterKey(undefined);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-xs font-medium transition-all",
                    subject === s
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground",
                  )}
                >
                  {SUBJECT_META[s].label}
                </button>
              ))}
            </div>
          </div>

          {subjectChapters.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Chapter (optional)</div>
              <select
                value={chapterKey ?? ""}
                onChange={(e) => setChapterKey(e.target.value || undefined)}
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[14px] outline-none ring-1 ring-white/10"
              >
                <option value="">— None —</option>
                {subjectChapters.map((c) => (
                  <option key={c.key} value={c.key}>
                    {chapterDisplayName(c, metaMap)}
                    {profileLevel === "dropper" ? ` (Class ${c.classLevel})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Priority</div>
              <div className="flex gap-1.5">
                {(["low", "medium", "high"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-[11px] font-medium capitalize",
                      priority === p ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Due</div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-xs outline-none ring-1 ring-white/10"
              />
            </div>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full resize-none rounded-2xl bg-white/[0.04] px-4 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/50"
          />
        </div>

        <div className="mt-5 flex items-center gap-2">
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive active:scale-95"
              aria-label="Delete"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
          <button
            disabled={!canSave}
            onClick={save}
            className={cn(
              "flex h-12 flex-1 items-center justify-center rounded-full text-[15px] font-semibold transition-all",
              canSave ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground",
            )}
          >
            {mission ? "Save changes" : "Create mission"}
          </button>
        </div>
      </div>
    </div>
  );
}
