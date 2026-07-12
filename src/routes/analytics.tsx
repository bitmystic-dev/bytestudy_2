import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { useProfile, useMissions, useSessions, useChapterMeta, useChapterCustomizations } from "@/hooks/useCloud";
import type { SubjectId } from "@/lib/types";
import { SUBJECT_META } from "@/lib/types";
import { dayKey, formatDuration } from "@/lib/format";
import { getChaptersForProfile, getChapterMeta } from "@/lib/chapters";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const SUBJECT_BAR: Record<SubjectId, string> = {
  physics: "bg-indigo-400",
  chemistry: "bg-emerald-400",
  mathematics: "bg-amber-400",
};

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — BytePrep" },
      { name: "description", content: "See how your study time compounds over time." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [profile] = useProfile();
  const [sessions] = useSessions();
  const [missions] = useMissions();
  const [metaMap] = useChapterMeta();

  const chapters = useMemo(() => (profile ? getChaptersForProfile(profile.classLevel) : []), [profile]);

  // Last 7 days daily totals
  const days = useMemo(() => {
    const out: { key: string; label: string; sec: number; date: Date }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400_000);
      out.push({ key: dayKey(d.getTime()), label: d.toLocaleDateString(undefined, { weekday: "short" })[0], sec: 0, date: d });
    }
    for (const s of sessions) {
      const k = dayKey(s.endedAt);
      const row = out.find((r) => r.key === k);
      if (row) row.sec += s.durationSec;
    }
    return out;
  }, [sessions]);

  const week = days.reduce((sum, d) => sum + d.sec, 0);
  const maxDay = Math.max(1, ...days.map((d) => d.sec));

  // Subject breakdown (last 30d)
  const subjectSec = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400_000;
    const map: Record<SubjectId, number> = { physics: 0, chemistry: 0, mathematics: 0 };
    for (const s of sessions) {
      if (s.endedAt < cutoff || !s.subject) continue;
      map[s.subject] += s.durationSec;
    }
    return map;
  }, [sessions]);
  const totalSubjectSec = subjectSec.physics + subjectSec.chemistry + subjectSec.mathematics;

  // Chapter completion per subject
  const chapterCompletion = useMemo(() => {
    const map: Record<SubjectId, { total: number; count: number; done: number }> = {
      physics: { total: 0, count: 0, done: 0 },
      chemistry: { total: 0, count: 0, done: 0 },
      mathematics: { total: 0, count: 0, done: 0 },
    };
    for (const c of chapters) {
      const m = getChapterMeta(c.key, metaMap);
      map[c.subject].count += 1;
      map[c.subject].total += m.completion;
      if (m.completion >= 100) map[c.subject].done += 1;
    }
    return map;
  }, [chapters, metaMap]);

  // Heatmap: last 12 weeks
  const heatmap = useMemo(() => {
    const cells: { key: string; sec: number }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // start from 12*7 days ago, aligned
    const dayOfWeek = now.getDay();
    const end = new Date(now);
    const start = new Date(now.getTime() - (12 * 7 - 1 + dayOfWeek) * 86400_000);
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400_000)) {
      cells.push({ key: dayKey(d.getTime()), sec: 0 });
    }
    for (const s of sessions) {
      const k = dayKey(s.endedAt);
      const c = cells.find((x) => x.key === k);
      if (c) c.sec += s.durationSec;
    }
    return cells;
  }, [sessions]);

  const revisions = useMemo(() => {
    let total = 0;
    for (const c of chapters) total += getChapterMeta(c.key, metaMap).revisionCount;
    return total;
  }, [chapters, metaMap]);

  const goalHit = useMemo(() => {
    if (!profile) return 0;
    const goalSec = profile.dailyGoalMinutes * 60;
    return days.filter((d) => d.sec >= goalSec).length;
  }, [days, profile]);

  if (!profile) return <AppShell><div /></AppShell>;

  if (sessions.length === 0) {
    return (
      <AppShell>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Analytics</h1>
        <EmptyState
          icon={BarChart3}
          title="Not enough data yet"
          description="Run a focus session and your analytics will start appearing here."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Last 7 days · {formatDuration(week)}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="This week" value={formatDuration(week)} hint="Total focus" />
        <StatCard label="Goals hit" value={`${goalHit}/7`} hint="Days on target" />
      </div>

      {/* Weekly bars */}
      <SectionHeader title="Daily focus" />
      <div className="card-surface p-5">
        <div className="flex h-32 items-end justify-between gap-1.5">
          {days.map((d) => {
            const h = (d.sec / maxDay) * 100;
            return (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary/60 to-primary transition-all"
                    style={{ height: `${Math.max(h, 4)}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground">{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject comparison */}
      <SectionHeader title="Subjects" subtitle="Last 30 days" />
      <div className="card-surface space-y-3 p-4">
        {(Object.keys(SUBJECT_META) as SubjectId[]).map((s) => {
          const sec = subjectSec[s];
          const pct = totalSubjectSec > 0 ? (sec / totalSubjectSec) * 100 : 0;
          const meta = SUBJECT_META[s];
          return (
            <div key={s}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className={cn("font-medium", meta.accent)}>{meta.label}</span>
                <span className="text-muted-foreground">{formatDuration(sec)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={cn("h-full rounded-full transition-all", SUBJECT_BAR[s])}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Chapter completion */}
      <SectionHeader title="Chapter completion" />
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(SUBJECT_META) as SubjectId[]).map((s) => {
          const info = chapterCompletion[s];
          const avg = info.count > 0 ? info.total / info.count : 0;
          return (
            <div key={s} className="card-surface p-3.5">
              <div className={cn("text-[11px] font-medium", SUBJECT_META[s].accent)}>
                {SUBJECT_META[s].label}
              </div>
              <div className="mt-1 text-xl font-semibold">{Math.round(avg)}%</div>
              <div className="text-[10px] text-muted-foreground">
                {info.done}/{info.count} done
              </div>
            </div>
          );
        })}
      </div>

      {/* Heatmap */}
      <SectionHeader title="Consistency" subtitle="Last 12 weeks" />
      <div className="card-surface p-4">
        <div className="grid grid-flow-col grid-rows-7 gap-1">
          {heatmap.map((c) => {
            const level =
              c.sec === 0 ? 0 : c.sec < 900 ? 1 : c.sec < 2700 ? 2 : c.sec < 5400 ? 3 : 4;
            return (
              <div
                key={c.key}
                title={`${c.key} · ${formatDuration(c.sec)}`}
                className={cn(
                  "aspect-square w-full rounded-[3px] transition-colors",
                  level === 0 && "bg-white/[0.04]",
                  level === 1 && "bg-primary/25",
                  level === 2 && "bg-primary/45",
                  level === 3 && "bg-primary/70",
                  level === 4 && "bg-primary",
                )}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatCard label="Revisions" value={revisions} hint="Across chapters" />
        <StatCard
          label="Missions"
          value={`${missions.filter((m) => m.completed).length}/${missions.length}`}
          hint="Completed"
        />
      </div>
    </AppShell>
  );
}
