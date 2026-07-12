import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { ProgressRing } from "@/components/ProgressRing";
import { EmptyState } from "@/components/EmptyState";
import { useStore } from "@/hooks/useStore";
import { KEYS } from "@/lib/storage";
import type { ChapterMeta, Profile, SubjectId } from "@/lib/types";
import { DEFAULT_CHAPTER_META, SUBJECT_META } from "@/lib/types";
import {
  chapterDisplayName,
  getChapterMeta,
  getChaptersForProfile,
  type ChapterRef,
} from "@/lib/chapters";
import { SubjectIcon } from "@/components/SubjectIcon";
import { ChevronLeft, Search, Pin, Bookmark, RotateCcw, Pencil, X, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const SUBJECTS = new Set<SubjectId>(["physics", "chemistry", "mathematics"]);
const EMPTY_META: Record<string, Partial<ChapterMeta>> = {};

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
  const [profile] = useStore<Profile | null>(KEYS.profile, null);
  const [metaMap, setMetaMap] = useStore<Record<string, Partial<ChapterMeta>>>(
    KEYS.chapterMeta,
    EMPTY_META,
  );
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<ChapterRef | null>(null);

  const chapters = useMemo(() => {
    if (!profile) return [];
    return getChaptersForProfile(profile.classLevel).filter((c) => c.subject === subject);
  }, [profile, subject]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = chapters.filter((c) => {
      const name = chapterDisplayName(c, metaMap).toLowerCase();
      return !ql || name.includes(ql);
    });
    // Pinned first
    return list.sort((a, b) => {
      const ap = getChapterMeta(a.key, metaMap).pinned ? 1 : 0;
      const bp = getChapterMeta(b.key, metaMap).pinned ? 1 : 0;
      return bp - ap;
    });
  }, [chapters, metaMap, q]);

  const meta = SUBJECT_META[subject as SubjectId];
  const totalCompletion =
    chapters.length > 0
      ? chapters.reduce((s, c) => s + getChapterMeta(c.key, metaMap).completion, 0) / chapters.length
      : 0;

  const patch = (key: string, next: Partial<ChapterMeta>) =>
    setMetaMap((prev) => ({ ...prev, [key]: { ...prev[key], ...next } }));

  if (!profile) return <AppShell><div /></AppShell>;

  return (
    <AppShell hideNav>
      <header className="mb-5 flex items-center gap-3">
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5"
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

      <label className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10">
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
        <div className="space-y-2">
          {filtered.map((c) => {
            const m = getChapterMeta(c.key, metaMap);
            const name = chapterDisplayName(c, metaMap);
            return (
              <div key={c.key} className="card-surface p-4">
                <div className="flex items-start gap-3">
                  <ProgressRing value={m.completion} size={44} stroke={5} ringClassName={meta.ring}>
                    <span className="text-[10px] font-semibold tabular-nums">{Math.round(m.completion)}</span>
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-medium">{name}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {profile.classLevel === "dropper" ? `Class ${c.classLevel} · ` : ""}
                          Revisions {m.revisionCount} · Confidence {m.confidence}/5
                        </div>
                      </div>
                      <button
                        onClick={() => setEditing(c)}
                        className="rounded-full p-1.5 text-muted-foreground active:scale-90"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Stepper
                        value={m.completion}
                        onChange={(v) => patch(c.key, { completion: Math.max(0, Math.min(100, v)) })}
                        step={10}
                        suffix="%"
                        min={0}
                        max={100}
                      />
                      <button
                        onClick={() => patch(c.key, { pinned: !m.pinned })}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full",
                          m.pinned ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground",
                        )}
                        aria-label="Pin"
                      >
                        <Pin className={cn("h-3.5 w-3.5", m.pinned && "fill-current")} />
                      </button>
                      <button
                        onClick={() => patch(c.key, { bookmarked: !m.bookmarked })}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full",
                          m.bookmarked ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground",
                        )}
                        aria-label="Bookmark"
                      >
                        <Bookmark className={cn("h-3.5 w-3.5", m.bookmarked && "fill-current")} />
                      </button>
                    </div>
                  </div>
                </div>
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

function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = 100,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-between rounded-full bg-white/5 px-1 py-0.5 ring-1 ring-white/10">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground active:scale-90"
        aria-label="Decrease"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="text-xs font-medium tabular-nums">
        {Math.round(value)}
        {suffix}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground active:scale-90"
        aria-label="Increase"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto max-h-[85dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-5 pb-[max(env(safe-area-inset-bottom),1rem)] ring-1 ring-white/10">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Chapter details</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
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

          <SliderRow label="Completion" value={m.completion} onChange={(v) => onChange({ completion: v })} />
          <SliderRow label="Module" value={m.moduleProgress} onChange={(v) => onChange({ moduleProgress: v })} />
          <SliderRow label="DPP" value={m.dppProgress} onChange={(v) => onChange({ dppProgress: v })} />
          <SliderRow label="PYQ" value={m.pyqProgress} onChange={(v) => onChange({ pyqProgress: v })} />

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10">
              <div className="text-[11px] text-muted-foreground">Revisions</div>
              <div className="mt-1 flex items-center justify-between">
                <button
                  onClick={() => onChange({ revisionCount: Math.max(0, m.revisionCount - 1) })}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="text-lg font-semibold tabular-nums">{m.revisionCount}</span>
                <button
                  onClick={() => onChange({ revisionCount: m.revisionCount + 1 })}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10">
              <div className="text-[11px] text-muted-foreground">Confidence</div>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => onChange({ confidence: (n as 1 | 2 | 3 | 4 | 5) === m.confidence ? 0 : (n as 1 | 2 | 3 | 4 | 5) })}
                    className={cn(
                      "h-6 flex-1 rounded",
                      n <= m.confidence ? "bg-primary" : "bg-white/10",
                    )}
                    aria-label={`Confidence ${n}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
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

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="text-foreground tabular-nums">{Math.round(value)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
