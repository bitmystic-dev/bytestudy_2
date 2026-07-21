import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Square, RotateCcw, Timer as TimerIcon, BookOpen, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressRing } from "@/components/ProgressRing";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { useSessions } from "@/hooks/useCloud";
import type { FocusSession, SubjectId } from "@/lib/types";
import { SUBJECT_META } from "@/lib/types";
import { dayKey, formatClock, formatDuration, uid } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/focus")({
  head: () => ({
    meta: [
      { title: "Focus — BytePrep" },
      { name: "description", content: "A distraction-free timer for deep work." },
    ],
  }),
  component: FocusPage,
});

type Preset = { label: string; minutes: number };
const PRESETS: Preset[] = [
  { label: "Pomodoro", minutes: 25 },
  { label: "Deep", minutes: 50 },
  { label: "Sprint", minutes: 15 },
];

// ALLEN homework benchmark: 75 questions in 180 minutes = 2.4 min per question.
const MIN_PER_QUESTION = 180 / 75;
function computeHomeworkMinutes(questions: number): number {
  return Math.max(1, Math.ceil(questions * MIN_PER_QUESTION));
}

function FocusPage() {
  const [sessions, setSessions] = useSessions();

  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [customMin, setCustomMin] = useState<number>(45);
  const [subject, setSubject] = useState<SubjectId | undefined>(undefined);
  const [remaining, setRemaining] = useState<number>(preset.minutes * 60);
  const [running, setRunning] = useState(false);
  const [homeworkOpen, setHomeworkOpen] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const totalRef = useRef<number>(preset.minutes * 60);

  const totalSec = totalRef.current;
  const progress = totalSec > 0 ? ((totalSec - remaining) / totalSec) * 100 : 0;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          finishSession(totalSec);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const applyPreset = (p: Preset) => {
    if (running) return;
    setPreset(p);
    totalRef.current = p.minutes * 60;
    setRemaining(p.minutes * 60);
  };

  const applyCustom = (min: number) => {
    if (running) return;
    const clean = Math.max(1, Math.min(240, Math.round(min)));
    setCustomMin(clean);
    totalRef.current = clean * 60;
    setRemaining(clean * 60);
    setPreset({ label: "Custom", minutes: clean });
  };

  const applyHomework = (questions: number, subj: SubjectId | undefined) => {
    if (running) return;
    const mins = computeHomeworkMinutes(questions);
    totalRef.current = mins * 60;
    setRemaining(mins * 60);
    setPreset({ label: `Homework · ${questions}Q`, minutes: mins });
    if (subj !== undefined) setSubject(subj);
    setHomeworkOpen(false);
  };

  const start = () => {
    if (remaining <= 0) totalRef.current && setRemaining(totalRef.current);
    startedAtRef.current = Date.now() - (totalRef.current - remaining) * 1000;
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const stop = () => {
    if (running || remaining < totalRef.current) {
      const elapsed = totalRef.current - remaining;
      if (elapsed >= 30) finishSession(elapsed);
    }
    setRunning(false);
    setRemaining(totalRef.current);
    startedAtRef.current = null;
  };
  const reset = () => {
    setRunning(false);
    setRemaining(totalRef.current);
    startedAtRef.current = null;
  };

  const finishSession = (durationSec: number) => {
    if (durationSec < 30) return;
    const startedAt = startedAtRef.current ?? Date.now() - durationSec * 1000;
    const session: FocusSession = {
      id: uid(),
      subject,
      startedAt,
      endedAt: Date.now(),
      durationSec,
      mode: preset.label === "Custom" ? "custom" : "pomodoro",
    };
    setSessions((prev) => [session, ...prev].slice(0, 500));
    setRunning(false);
    startedAtRef.current = null;
  };

  const today = dayKey(Date.now());
  const todayStats = useMemo(() => {
    const list = sessions.filter((s) => dayKey(s.endedAt) === today);
    return {
      total: list.reduce((s, x) => s + x.durationSec, 0),
      count: list.length,
    };
  }, [sessions, today]);

  const recent = sessions.slice(0, 8);
  const isHomework = preset.label.startsWith("Homework");

  return (
    <AppShell>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Focus</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Today · {formatDuration(todayStats.total)} · {todayStats.count} sessions
        </p>
      </header>

      {/* Timer */}
      <div className="card-surface flex flex-col items-center px-6 py-8">
        <ProgressRing
          value={progress}
          size={240}
          stroke={12}
          ringClassName={subject ? SUBJECT_META[subject].ring : "stroke-primary"}
        >
          <div className="text-center">
            <div className="text-5xl font-semibold tracking-tight tabular-nums">
              {formatClock(remaining)}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
              {preset.label}
            </div>
          </div>
        </ProgressRing>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={reset}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-muted-foreground active:scale-95"
            aria-label="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={running ? pause : start}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-95"
            aria-label={running ? "Pause" : "Start"}
          >
            {running ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
          </button>
          <button
            onClick={stop}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-muted-foreground active:scale-95"
            aria-label="Stop"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        </div>
      </div>

      {/* Presets */}
      <SectionHeader title="Preset" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            disabled={running}
            onClick={() => applyPreset(p)}
            className={cn(
              "rounded-2xl border px-3 py-3 text-left transition-all disabled:opacity-50",
              preset.label === p.label
                ? "border-primary/50 bg-primary/10"
                : "border-white/10 bg-white/[0.03]",
            )}
          >
            <div className="text-sm font-semibold">{p.label}</div>
            <div className="text-[11px] text-muted-foreground">{p.minutes} min</div>
          </button>
        ))}
        <button
          disabled={running}
          onClick={() => setHomeworkOpen(true)}
          className={cn(
            "rounded-2xl border px-3 py-3 text-left transition-all disabled:opacity-50",
            isHomework
              ? "border-amber-400/50 bg-amber-500/10"
              : "border-white/10 bg-white/[0.03]",
          )}
        >
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <BookOpen className="h-3.5 w-3.5" />
            Homework
          </div>
          <div className="text-[11px] text-muted-foreground">
            {isHomework ? `${preset.minutes} min` : "By question count"}
          </div>
        </button>
      </div>

      {/* Custom */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/10">
        <span className="text-xs text-muted-foreground">Custom</span>
        <input
          type="number"
          min={1}
          max={240}
          value={customMin}
          disabled={running}
          onChange={(e) => applyCustom(Number(e.target.value))}
          className="w-16 rounded-lg bg-white/5 px-2 py-1.5 text-center text-sm tabular-nums outline-none ring-1 ring-white/10 disabled:opacity-50"
        />
        <span className="text-xs text-muted-foreground">min</span>
      </div>

      {/* Subject tag */}
      <SectionHeader title="Tag session" subtitle="Optional" />
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => setSubject(undefined)}
          className={cn(
            "rounded-xl border px-2 py-2.5 text-[11px] font-medium transition-all",
            !subject ? "border-primary/50 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground",
          )}
        >
          None
        </button>
        {(Object.keys(SUBJECT_META) as SubjectId[]).map((s) => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={cn(
              "rounded-xl border px-2 py-2.5 text-[11px] font-medium transition-all",
              subject === s
                ? cn("border-primary/50", SUBJECT_META[s].soft)
                : "border-white/10 bg-white/[0.03] text-muted-foreground",
            )}
          >
            {SUBJECT_META[s].label.slice(0, 4)}
          </button>
        ))}
      </div>

      {/* History */}
      <SectionHeader title="Recent sessions" />
      {recent.length === 0 ? (
        <EmptyState icon={TimerIcon} title="No sessions yet" description="Your first focus block will appear here." />
      ) : (
        <div className="space-y-2">
          {recent.map((s) => (
            <div key={s.id} className="card-surface flex items-center gap-3 p-3.5">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  s.subject ? SUBJECT_META[s.subject].soft : "bg-white/5 text-muted-foreground",
                )}
              >
                <TimerIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                  {s.subject ? SUBJECT_META[s.subject].label : "Focus"} · {formatDuration(s.durationSec)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(s.endedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" · "}{s.mode}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {homeworkOpen && (
        <HomeworkSheet
          initialSubject={subject}
          onClose={() => setHomeworkOpen(false)}
          onApply={applyHomework}
        />
      )}
    </AppShell>
  );
}

function HomeworkSheet({
  initialSubject,
  onClose,
  onApply,
}: {
  initialSubject: SubjectId | undefined;
  onClose: () => void;
  onApply: (questions: number, subject: SubjectId | undefined) => void;
}) {
  const [q, setQ] = useState<number>(30);
  const [subj, setSubj] = useState<SubjectId | undefined>(initialSubject);
  const mins = computeHomeworkMinutes(q);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto w-full max-w-[480px] rounded-t-3xl bg-[var(--surface)] p-5 pb-[max(env(safe-area-inset-bottom),1rem)] ring-1 ring-white/10 animate-in slide-in-from-bottom">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-300" />
            <h2 className="text-lg font-semibold tracking-tight">Homework timer</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Enter how many questions you have. We use ALLEN's benchmark of 75 questions in 3 hours (2.4 min / Q).
        </p>

        <div className="mt-4 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Questions
            </span>
            <span className="text-4xl font-semibold tabular-nums">{q}</span>
          </div>
          <input
            type="range"
            min={5}
            max={150}
            step={1}
            value={q}
            onChange={(e) => setQ(Number(e.target.value))}
            className="mt-3 w-full accent-amber-400"
          />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[15, 30, 50, 75].map((n) => (
              <button
                key={n}
                onClick={() => setQ(n)}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-xs font-medium ring-1",
                  q === n
                    ? "bg-amber-500/15 text-amber-200 ring-amber-400/30"
                    : "bg-white/5 text-muted-foreground ring-white/10",
                )}
              >
                {n} Q
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-amber-500/10 px-4 py-3 ring-1 ring-amber-400/20">
          <span className="text-xs font-medium text-amber-200">Recommended time</span>
          <span className="text-lg font-semibold text-amber-100 tabular-nums">
            {mins} min
          </span>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Subject <span className="normal-case text-muted-foreground/70">(optional)</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setSubj(undefined)}
              className={cn(
                "rounded-xl border px-2 py-2.5 text-[11px] font-medium transition-all",
                !subj
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground",
              )}
            >
              None
            </button>
            {(Object.keys(SUBJECT_META) as SubjectId[]).map((s) => (
              <button
                key={s}
                onClick={() => setSubj(s)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-[11px] font-medium transition-all",
                  subj === s
                    ? cn("border-primary/50", SUBJECT_META[s].soft)
                    : "border-white/10 bg-white/[0.03] text-muted-foreground",
                )}
              >
                {SUBJECT_META[s].label.slice(0, 4)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onApply(q, subj)}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground active:scale-[0.99]"
        >
          Set timer to {mins} min
        </button>
      </div>
    </div>
  );
}
