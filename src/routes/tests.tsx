import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft,
  Plus,
  X,
  Calendar,
  Trash2,
  Upload,
  Sparkles,
  Pencil,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { useTests } from "@/hooks/useCloud";
import type { SubjectId, Test, TestStatus } from "@/lib/types";
import { SUBJECT_META } from "@/lib/types";
import { uid } from "@/lib/format";
import { cn } from "@/lib/utils";
import { aiParseTestSchedule } from "@/lib/ai.functions";
import { extractPdfText } from "@/lib/pdf-extract";


export const Route = createFileRoute("/tests")({
  head: () => ({
    meta: [
      { title: "Test Schedule — BytePrep" },
      {
        name: "description",
        content: "Track upcoming tests, syllabus, and results.",
      },
    ],
  }),
  component: TestsPage,
});

const ALL_SUBJECTS: SubjectId[] = ["physics", "chemistry", "mathematics"];

function TestsPage() {
  const [tests, setTests] = useTests();
  const [sheetOpen, setSheetOpen] = useState<Test | "new" | null>(null);
  const [pdfNotice, setPdfNotice] = useState(false);

  const now = Date.now();
  const upcoming = useMemo(
    () =>
      tests
        .filter((t) => t.status === "upcoming")
        .sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime()),
    [tests],
  );
  const past = useMemo(
    () =>
      tests
        .filter((t) => t.status !== "upcoming")
        .sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()),
    [tests],
  );

  const nextTest = upcoming[0];

  const save = (t: Test) => {
    setTests((prev) => {
      const exists = prev.find((x) => x.id === t.id);
      if (exists) return prev.map((x) => (x.id === t.id ? t : x));
      return [...prev, t];
    });
    setSheetOpen(null);
  };

  const remove = (id: string) => {
    setTests((prev) => prev.filter((t) => t.id !== id));
    setSheetOpen(null);
  };

  const toggleStatus = (id: string, next: TestStatus) => {
    setTests((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: next } : t)),
    );
  };

  return (
    <AppShell hideNav>
      <header className="mb-5 flex items-center gap-3">
        <Link
          to="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Test schedule
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        <button
          onClick={() => setSheetOpen("new")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95"
          aria-label="Add test"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {/* PDF upload card */}
      <button
        onClick={() => setPdfNotice(true)}
        className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.05]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Upload className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium">Upload test schedule PDF</div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> AI parsing — coming soon
          </div>
        </div>
      </button>

      {/* Countdown hero */}
      {nextTest && (
        <CountdownHero test={nextTest} now={now} />
      )}

      <SectionHeader title="Upcoming" />
      {upcoming.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No tests yet"
          description="Add your institute test schedule to see countdowns and stay ahead."
          action={
            <button
              onClick={() => setSheetOpen("new")}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Add test
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {upcoming.map((t) => (
            <TestCard
              key={t.id}
              test={t}
              now={now}
              onEdit={() => setSheetOpen(t)}
              onComplete={() => toggleStatus(t.id, "completed")}
            />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <SectionHeader title="Past" />
          <div className="space-y-2">
            {past.map((t) => (
              <TestCard
                key={t.id}
                test={t}
                now={now}
                onEdit={() => setSheetOpen(t)}
              />
            ))}
          </div>
        </>
      )}

      {sheetOpen && (
        <TestSheet
          test={sheetOpen === "new" ? undefined : sheetOpen}
          onClose={() => setSheetOpen(null)}
          onSave={save}
          onDelete={sheetOpen === "new" ? undefined : () => remove(sheetOpen.id)}
        />
      )}

      {pdfNotice && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPdfNotice(false)}
          />
          <div className="relative mx-auto w-full max-w-[480px] rounded-t-3xl bg-[var(--surface)] p-5 pb-[max(env(safe-area-inset-bottom),1rem)] ring-1 ring-white/10">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">
                AI PDF parsing — coming soon
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Once enabled, upload your institute's test schedule PDF and BytePrep AI
              will extract each test's name, date, subjects, and syllabus for you.
              For now, please add tests manually.
            </p>
            <button
              onClick={() => {
                setPdfNotice(false);
                setSheetOpen("new");
              }}
              className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              Add test manually
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ============================================================

function CountdownHero({ test, now }: { test: Test; now: number }) {
  const days = Math.max(
    0,
    Math.ceil((new Date(test.testDate).getTime() - now) / 86400000),
  );
  const label =
    days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days away`;
  return (
    <div className="card-surface mb-5 relative overflow-hidden p-5">
      <div className="absolute inset-0 -z-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-60" />
      <div className="relative z-10">
        <div className="text-[10px] font-medium uppercase tracking-widest text-primary">
          Next test
        </div>
        <div className="mt-1 truncate text-lg font-semibold tracking-tight">
          {test.name}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-4xl font-semibold tabular-nums tracking-tight">
            {days}
          </div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {test.subjects.map((s) => (
            <span
              key={s}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                SUBJECT_META[s].soft,
              )}
            >
              {SUBJECT_META[s].label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TestCard({
  test,
  now,
  onEdit,
  onComplete,
}: {
  test: Test;
  now: number;
  onEdit: () => void;
  onComplete?: () => void;
}) {
  const testTs = new Date(test.testDate).getTime();
  const days = Math.ceil((testTs - now) / 86400000);
  const isPast = test.status !== "upcoming";
  const dateLabel = new Date(test.testDate).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const badge =
    test.status === "completed" ? (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
        <CheckCircle2 className="h-3 w-3" /> Done
      </span>
    ) : test.status === "missed" ? (
      <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-300">
        <AlertTriangle className="h-3 w-3" /> Missed
      </span>
    ) : days < 0 ? (
      <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-300">
        <Clock className="h-3 w-3" /> Overdue
      </span>
    ) : days <= 3 ? (
      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
        <Clock className="h-3 w-3" /> In {days}d
      </span>
    ) : (
      <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        <Calendar className="h-3 w-3" /> In {days}d
      </span>
    );

  return (
    <div className={cn("card-surface p-3.5", isPast && "opacity-70")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 truncate text-[14px] font-semibold">
              {test.name}
            </div>
            {badge}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {dateLabel}
            {test.score != null && test.maxScore != null && (
              <>
                {" "}
                · {test.score}/{test.maxScore}
              </>
            )}
          </div>
          {test.subjects.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {test.subjects.map((s) => (
                <span
                  key={s}
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                    SUBJECT_META[s].soft,
                  )}
                >
                  {SUBJECT_META[s].label.slice(0, 4)}
                </span>
              ))}
            </div>
          )}
          {test.syllabus && (
            <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
              {test.syllabus}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            onClick={onEdit}
            aria-label="Edit"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-muted-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {onComplete && !isPast && (
            <button
              onClick={onComplete}
              aria-label="Mark done"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================

function TestSheet({
  test,
  onClose,
  onSave,
  onDelete,
}: {
  test?: Test;
  onClose: () => void;
  onSave: (t: Test) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(test?.name ?? "");
  const [date, setDate] = useState(
    test?.testDate ? test.testDate.slice(0, 10) : "",
  );
  const [time, setTime] = useState(
    test?.testDate ? test.testDate.slice(11, 16) : "09:00",
  );
  const [subjects, setSubjects] = useState<SubjectId[]>(test?.subjects ?? []);
  const [syllabus, setSyllabus] = useState(test?.syllabus ?? "");
  const [notes, setNotes] = useState(test?.notes ?? "");
  const [status, setStatus] = useState<TestStatus>(test?.status ?? "upcoming");
  const [score, setScore] = useState(test?.score?.toString() ?? "");
  const [maxScore, setMaxScore] = useState(test?.maxScore?.toString() ?? "");

  const canSave = name.trim().length > 0 && !!date;

  const toggleSubject = (s: SubjectId) => {
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const save = () => {
    if (!canSave) return;
    const iso = new Date(`${date}T${time || "09:00"}:00`).toISOString();
    const t: Test = {
      id: test?.id ?? uid(),
      name: name.trim(),
      testDate: iso,
      subjects,
      syllabus: syllabus.trim(),
      notes: notes.trim(),
      status,
      score: score ? Number(score) : undefined,
      maxScore: maxScore ? Number(maxScore) : undefined,
      source: test?.source ?? "manual",
      createdAt: test?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    onSave(t);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative mx-auto flex max-h-[90vh] w-full max-w-[480px] flex-col rounded-t-3xl bg-[var(--surface)] pb-[max(env(safe-area-inset-bottom),1rem)] ring-1 ring-white/10 animate-in slide-in-from-bottom">
        <div className="px-5 pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              {test ? "Edit test" : "New test"}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Test name (e.g. Minor Test 3)"
            className="w-full rounded-2xl bg-white/[0.04] px-4 py-3.5 text-[15px] outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/50"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Date
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-xs outline-none ring-1 ring-white/10"
              />
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Time
              </div>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-xs outline-none ring-1 ring-white/10"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Subjects
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ALL_SUBJECTS.map((s) => {
                const on = subjects.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-medium transition-all",
                      on
                        ? cn(SUBJECT_META[s].soft, "border-current")
                        : "border-white/10 bg-white/[0.03] text-muted-foreground",
                    )}
                  >
                    {SUBJECT_META[s].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Syllabus (topics covered)
            </div>
            <textarea
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              rows={3}
              placeholder="e.g. Kinematics, Laws of Motion, Rotational Motion"
              className="w-full resize-none rounded-2xl bg-white/[0.04] px-4 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/50"
            />
          </div>

          {(test || status !== "upcoming") && (
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Status
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(["upcoming", "completed", "missed"] as TestStatus[]).map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        "rounded-lg py-2 text-[11px] font-medium capitalize",
                        status === s
                          ? "bg-primary/20 text-primary"
                          : "bg-white/5 text-muted-foreground",
                      )}
                    >
                      {s}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {status === "completed" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Score
                </div>
                <input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="e.g. 240"
                  className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-xs outline-none ring-1 ring-white/10"
                />
              </div>
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Max
                </div>
                <input
                  type="number"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  placeholder="e.g. 300"
                  className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-xs outline-none ring-1 ring-white/10"
                />
              </div>
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notes (optional)"
            className="w-full resize-none rounded-2xl bg-white/[0.04] px-4 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/50"
          />
        </div>

        <div className="border-t border-white/5 px-5 pt-4">
          <div className="flex items-center gap-2">
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
                canSave
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/5 text-muted-foreground",
              )}
            >
              {test ? "Save changes" : "Create test"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
