import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { ProgressRing } from "@/components/ProgressRing";
import { EmptyState } from "@/components/EmptyState";
import { useProfile, useChapterMeta, useChapterCustomizations } from "@/hooks/useCloud";
import type { CheckpointId, ChapterMeta, SubjectId } from "@/lib/types";
import { CHECKPOINTS, DEFAULT_CHAPTER_META, SUBJECT_META, checkpointCompletion } from "@/lib/types";
import {
  chapterDisplayName,
  getChapterMeta,
  getChaptersForProfile,
  type ChapterRef,
} from "@/lib/chapters";
import { SubjectIcon } from "@/components/SubjectIcon";
import {
  ChevronLeft,
  ChevronDown,
  Search,
  Pin,
  Bookmark,
  RotateCcw,
  Pencil,
  X,
  BookOpen,
  RefreshCcw,
  ClipboardList,
  NotebookPen,
  Puzzle,
  Zap,
  Check,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SUBJECTS = new Set<SubjectId>(["physics", "chemistry", "mathematics"]);

const CHECKPOINT_ICON = {
  book: BookOpen,
  refresh: RefreshCcw,
  clipboard: ClipboardList,
  notebook: NotebookPen,
  puzzle: Puzzle,
  zap: Zap,
} as const;

// Subject-specific checkpoint tint (bg + text) for the icon tile.
const CHECKPOINT_TINT: Record<SubjectId, string> = {
  physics: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/20",
  chemistry: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  mathematics: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
};

const CHECKBOX_ACTIVE: Record<SubjectId, string> = {
  physics: "bg-indigo-400 border-indigo-300 text-slate-900",
  chemistry: "bg-emerald-400 border-emerald-300 text-slate-900",
  mathematics: "bg-amber-400 border-amber-300 text-slate-900",
};

const PROGRESS_BAR: Record<SubjectId, string> = {
  physics: "bg-indigo-400",
  chemistry: "bg-emerald-400",
  mathematics: "bg-amber-400",
};

export const Route = createFileRoute("/subjects/$subject")({
  parseParams: ({ subject }) => {
    if (!SUBJECTS.has(subject as SubjectId)) throw notFound();
    return { subject: subject as SubjectId };
  },
  head: ({ params }) => ({
    meta: [
      { title: `${SUBJECT_META[params.subject].label} — BytePrep` },
      { name: "description", content: `${SUBJECT_META[params.subject].label} chapters and progress.` },
    ],
  }),
  component: SubjectPage,
});

function SubjectPage() {
  const { subject } = Route.useParams();
  const [profile] = useProfile();
  const [metaMap, setMetaMap] = useChapterMeta();
  const [customizations] = useChapterCustomizations();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<ChapterRef | null>(null);

  const chapters = useMemo(() => {
    if (!profile) return [];
    return getChaptersForProfile(profile.classLevel, customizations).filter((c) => c.subject === subject);
  }, [profile, subject, customizations]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = chapters.filter((c) => {
      const name = chapterDisplayName(c, metaMap, customizations).toLowerCase();
      return !ql || name.includes(ql);
    });
    return list.sort((a, b) => {
      const ap = getChapterMeta(a.key, metaMap).pinned ? 1 : 0;
      const bp = getChapterMeta(b.key, metaMap).pinned ? 1 : 0;
      return bp - ap;
    });
  }, [chapters, metaMap, customizations, q]);

  const meta = SUBJECT_META[subject as SubjectId];
  const totalCompletion =
    chapters.length > 0
      ? chapters.reduce(
          (s, c) => s + checkpointCompletion(getChapterMeta(c.key, metaMap).checkpoints),
          0,
        ) / chapters.length
      : 0;

  const patch = (key: string, next: Partial<ChapterMeta>) =>
    setMetaMap((prev) => ({ ...prev, [key]: { ...prev[key], ...next } }));

  const toggleCheckpoint = (key: string, id: CheckpointId) => {
    const current = getChapterMeta(key, metaMap).checkpoints ?? {};
    const willBe = !current[id];
    // P6: marking a chapter as "learned" cascades to fully-completed.
    if (id === "learned" && willBe) {
      const allDone: Record<CheckpointId, boolean> = {
        learned: true,
        revised: true,
        pyqs: true,
        notes: true,
        tests: true,
        shortNotes: true,
      };
      patch(key, { checkpoints: allDone, completion: 100 });
      return;
    }
    const nextCp = { ...current, [id]: willBe };
    patch(key, { checkpoints: nextCp, completion: checkpointCompletion(nextCp) });
  };

  if (!profile) return <AppShell><div /></AppShell>;

  return (
    <AppShell hideNav>
      <header className="mb-5 flex items-center gap-3">
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className={cn("truncate text-xl font-semibold tracking-tight", meta.accent)}>
            {meta.label}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {chapters.length} chapter{chapters.length === 1 ? "" : "s"} · {Math.round(totalCompletion)}% complete
          </p>
        </div>
        <ProgressRing value={totalCompletion} size={40} stroke={4} ringClassName={meta.ring}>
          <SubjectIcon subject={subject} className={cn("h-3.5 w-3.5", meta.accent)} />
        </ProgressRing>
      </header>

      <label className="flex items-center gap-2 rounded-2xl bg-elevated px-4 py-3 ring-1 ring-hairline">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search chapters"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      <SectionHeader title="Chapters" />
      {filtered.length === 0 ? (
        <EmptyState title="No chapters" description="Add chapters via class11.json / class12.json." />
      ) : (
        <div className="space-y-3">
          {filtered.map((c, idx) => {
            const m = getChapterMeta(c.key, metaMap);
            const cp = m.checkpoints ?? {};
            const done = CHECKPOINTS.reduce((n, x) => n + (cp[x.id] ? 1 : 0), 0);
            const pct = checkpointCompletion(cp);
            const name = chapterDisplayName(c, metaMap, customizations);
            const isOpen = expanded === c.key;
            return (
              <div key={c.key} className="card-surface overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : c.key)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ring-1",
                      CHECKPOINT_TINT[subject as SubjectId],
                    )}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-[15px] font-medium">{name}</div>
                      {c.important && (
                        <Star
                          className="h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                          aria-label="Important chapter"
                        />
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      {CHECKPOINTS.map((x) => (
                        <span
                          key={x.id}
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ring-1",
                            cp[x.id]
                              ? CHECKBOX_ACTIVE[subject as SubjectId]
                              : "bg-elevated text-muted-foreground ring-hairline",
                          )}
                          title={x.label}
                        >
                          {x.label[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {done}/{CHECKPOINTS.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-hairline px-4 pb-4 pt-2">
                    <ul className="divide-y divide-hairline">
                      {CHECKPOINTS.map((x) => {
                        const Icon = CHECKPOINT_ICON[x.icon];
                        const checked = !!cp[x.id];
                        return (
                          <li key={x.id}>
                            <button
                              onClick={() => toggleCheckpoint(c.key, x.id)}
                              className="flex w-full items-center gap-3 py-3 text-left active:opacity-70"
                            >
                              <span
                                className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-xl ring-1",
                                  CHECKPOINT_TINT[subject as SubjectId],
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div
                                  className={cn(
                                    "text-[14px] font-medium",
                                    checked ? "text-foreground" : "text-foreground/90",
                                  )}
                                >
                                  {x.label}
                                </div>
                                <div className="text-[11px] text-muted-foreground">{x.hint}</div>
                              </div>
                              <span
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                                  checked
                                    ? CHECKBOX_ACTIVE[subject as SubjectId]
                                    : "border-hairline bg-transparent",
                                )}
                              >
                                {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
                        <div
                          className={cn("h-full transition-all", PROGRESS_BAR[subject as SubjectId])}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => patch(c.key, { pinned: !m.pinned })}
                        className={cn(
                          "flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium",
                          m.pinned ? "bg-primary/20 text-primary" : "bg-elevated text-muted-foreground",
                        )}
                      >
                        <Pin className={cn("h-3 w-3", m.pinned && "fill-current")} />
                        {m.pinned ? "Pinned" : "Pin"}
                      </button>
                      <button
                        onClick={() => patch(c.key, { bookmarked: !m.bookmarked })}
                        className={cn(
                          "flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium",
                          m.bookmarked ? "bg-primary/20 text-primary" : "bg-elevated text-muted-foreground",
                        )}
                      >
                        <Bookmark className={cn("h-3 w-3", m.bookmarked && "fill-current")} />
                        {m.bookmarked ? "Saved" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditing(c)}
                        className="ml-auto flex h-8 items-center gap-1.5 rounded-full bg-elevated px-3 text-[11px] font-medium text-muted-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                        Rename
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ChapterSheet
          chapter={editing}
          onClose={() => setEditing(null)}
          metaMap={metaMap}
          onChange={(next) => patch(editing.key, next)}
          onResetName={() => patch(editing.key, { overrideName: undefined })}
        />
      )}
    </AppShell>
  );
}

function ChapterSheet({
  chapter,
  metaMap,
  onClose,
  onChange,
  onResetName,
}: {
  chapter: ChapterRef;
  metaMap: Record<string, Partial<ChapterMeta>>;
  onClose: () => void;
  onChange: (next: Partial<ChapterMeta>) => void;
  onResetName: () => void;
}) {
  const m = { ...DEFAULT_CHAPTER_META, ...(metaMap[chapter.key] ?? {}) };
  const [name, setName] = useState(m.overrideName ?? "");
  const [notes, setNotes] = useState(m.notes);

  const saveName = () => {
    const trimmed = name.trim();
    onChange({ overrideName: trimmed || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto max-h-[85dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-5 pb-[max(env(safe-area-inset-bottom),1rem)] ring-1 ring-hairline">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-elevated-strong" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Chapter details</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-elevated p-4 ring-1 ring-hairline">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Chapter name
              </span>
              {m.overrideName && (
                <button
                  onClick={() => {
                    setName("");
                    onResetName();
                  }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground active:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              placeholder={chapter.defaultName}
              className="w-full bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Default: {chapter.defaultName}
            </p>
          </div>

          <div className="rounded-2xl bg-elevated p-4 ring-1 ring-hairline">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Notes
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => onChange({ notes })}
              rows={3}
              placeholder="Add notes for later"
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-primary-foreground"
        >
          Done
        </button>
      </div>
    </div>
  );
}
