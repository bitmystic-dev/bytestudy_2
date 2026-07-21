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

  // Daily stats
  const today = dayKey(Date.now());
  const todayStats = useMemo(() => {
    const list = sessions.filter((s) => dayKey(s.endedAt) === today);
    return {
      total: list.reduce((s, x) => s + x.durationSec, 0),
      count: list.length,
    };
  }, [sessions, today]);

  const recent = sessions.slice(0, 8);

  // Homework modal
  const [homeworkOpen, setHomeworkOpen] = useState(false);

  const applyHomework = (questions: number, subj: SubjectId | undefined) => {
    if (running) return;
    const mins = computeHomeworkMinutes(questions);
    totalRef.current = mins * 60;
    setRemaining(mins * 60);
    setPreset({ label: `Homework · ${questions}Q`, minutes: mins });
    if (subj) setSubject(subj);
    setHomeworkOpen(false);
  };

  return (
    <>
      {/* existing return below */}
    </>
  );
}

// Split — real render lives here so we keep the diff scoped.


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
      <div className="grid grid-cols-3 gap-2">
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
    </AppShell>
  );
}
