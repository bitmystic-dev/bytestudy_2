import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Play, Sparkles, Plus, Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressRing } from "@/components/ProgressRing";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { SubjectCard } from "@/components/SubjectCard";
import { MissionCard } from "@/components/MissionCard";
import { EmptyState } from "@/components/EmptyState";
import { useProfile, useMissions, useSessions, useChapterMeta } from "@/hooks/useCloud";
import type { FocusSession, Mission, SubjectId } from "@/lib/types";
import { chapterDisplayName, getChapterMeta, getChaptersForProfile } from "@/lib/chapters";
import { dayKey, formatDuration, greetingFor } from "@/lib/format";
import { useMemo } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — BytePrep" },
      { name: "description", content: "Your calm study dashboard for JEE preparation." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [profile] = useProfile();
  const [metaMap] = useChapterMeta();
  const [missions, setMissions] = useMissions();
  const [sessions] = useSessions();

  const chapters = useMemo(() => (profile ? getChaptersForProfile(profile.classLevel) : []), [profile]);

  const perSubject = useMemo(() => {
    const out: Record<SubjectId, { count: number; total: number }> = {
      physics: { count: 0, total: 0 },
      chemistry: { count: 0, total: 0 },
      mathematics: { count: 0, total: 0 },
    };
    for (const c of chapters) {
      const m = getChapterMeta(c.key, metaMap);
      out[c.subject].count += 1;
      out[c.subject].total += m.completion;
    }
    return out;
  }, [chapters, metaMap]);

  const today = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - 86400_000);

  const todaySec = sessions
    .filter((s) => dayKey(s.endedAt) === today)
    .reduce((sum, s) => sum + s.durationSec, 0);
  const yesterdaySec = sessions
    .filter((s) => dayKey(s.endedAt) === yesterday)
    .reduce((sum, s) => sum + s.durationSec, 0);

  const goalSec = (profile?.dailyGoalMinutes ?? 240) * 60;
  const goalPct = Math.min(100, (todaySec / goalSec) * 100);

  const streak = computeStreak(sessions);
  const upcomingMissions = missions
    .filter((m) => !m.completed)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
    .slice(0, 3);

  if (!profile) {
    return <AppShell><div className="h-4" /></AppShell>;
  }

  const hour = new Date().getHours();
  const firstName = profile.name.split(" ")[0];

  const trendCopy = (() => {
    if (yesterdaySec === 0 && todaySec === 0) return "A fresh start.";
    if (todaySec > yesterdaySec) return "You're improving.";
    if (todaySec === yesterdaySec) return "Holding steady.";
    return "Still time today.";
  })();

  return (
    <AppShell>
      {/* Greeting */}
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {greetingFor(hour)}
        </p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">
          {firstName}.
        </h1>
      </header>

      {/* Today's Focus Ring */}
      <section className="card-surface flex items-center gap-5 p-5">
        <ProgressRing value={goalPct} size={104} stroke={10} ringClassName="stroke-primary">
          <div className="text-center">
            <div className="text-lg font-semibold leading-none">{Math.round(goalPct)}%</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">Today</div>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">Today's focus</div>
          <div className="mt-0.5 text-2xl font-semibold tracking-tight">
            {formatDuration(todaySec)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Yesterday · {formatDuration(yesterdaySec)}
          </div>
          <div className="mt-2 text-[13px] font-medium text-primary/90">{trendCopy}</div>
        </div>
      </section>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatCard
          label="Streak"
          value={
            <span className="flex items-baseline gap-1">
              {streak}
              <span className="text-sm font-medium text-muted-foreground">days</span>
            </span>
          }
          icon={<Flame className="h-4 w-4 text-amber-300" />}
        />
        <StatCard
          label="Goal"
          value={`${Math.floor(goalSec / 3600)}h ${(goalSec % 3600) / 60}m`.replace(" 0m", "")}
          hint="Daily target"
        />
      </div>

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate({ to: "/focus" })}
          className="card-surface flex items-center gap-3 p-4 text-left active:scale-[0.99]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Play className="h-5 w-5 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Start focus</div>
            <div className="text-xs text-muted-foreground">Pomodoro or custom</div>
          </div>
        </button>
        <button
          onClick={() => navigate({ to: "/planner" })}
          className="card-surface flex items-center gap-3 p-4 text-left active:scale-[0.99]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-foreground">
            <Plus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">New mission</div>
            <div className="text-xs text-muted-foreground">Plan a chapter</div>
          </div>
        </button>
      </div>

      {/* Upcoming missions */}
      <SectionHeader
        title="Upcoming missions"
        action={
          <button onClick={() => navigate({ to: "/planner" })} className="active:text-foreground">
            See all
          </button>
        }
      />
      {upcomingMissions.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing planned yet"
          description="Add your first mission — one small step is enough."
        />
      ) : (
        <div className="space-y-2">
          {upcomingMissions.map((m) => {
            const cn = chapters.find((c) => c.key === m.chapterKey);
            return (
              <MissionCard
                key={m.id}
                mission={m}
                chapterName={cn ? chapterDisplayName(cn, metaMap) : undefined}
                onToggle={() =>
                  setMissions((prev) =>
                    prev.map((x) =>
                      x.id === m.id
                        ? { ...x, completed: !x.completed, completedAt: !x.completed ? Date.now() : undefined }
                        : x,
                    ),
                  )
                }
                onPin={() =>
                  setMissions((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !x.pinned } : x)))
                }
              />
            );
          })}
        </div>
      )}

      {/* Subjects */}
      <SectionHeader title="Subjects" subtitle={profile.classLevel === "dropper" ? "Class 11 + 12" : `Class ${profile.classLevel}`} />
      <div className="space-y-2.5">
        {(["physics", "chemistry", "mathematics"] as SubjectId[]).map((s) => {
          const info = perSubject[s];
          const avg = info.count > 0 ? info.total / info.count : 0;
          return (
            <SubjectCard
              key={s}
              subject={s}
              completion={avg}
              chaptersCount={info.count}
              onClick={() => navigate({ to: "/subjects/$subject", params: { subject: s } })}
            />
          );
        })}
      </div>
    </AppShell>
  );
}

function computeStreak(sessions: FocusSession[]): number {
  if (sessions.length === 0) return 0;
  const set = new Set(sessions.map((s) => dayKey(s.endedAt)));
  let streak = 0;
  let cursor = Date.now();
  // If nothing today, streak can still count from yesterday.
  if (!set.has(dayKey(cursor))) cursor -= 86400_000;
  while (set.has(dayKey(cursor))) {
    streak += 1;
    cursor -= 86400_000;
  }
  return streak;
}
