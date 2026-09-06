import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Play, Sparkles, Plus, Flame, BookOpen, Timer, Target, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressRing } from "@/components/ProgressRing";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { SubjectCard } from "@/components/SubjectCard";
import { MissionCard } from "@/components/MissionCard";
import { EmptyState } from "@/components/EmptyState";
import { useProfile, useMissions, useSessions, useChapterMeta, useChapterCustomizations } from "@/hooks/useCloud";
import type { FocusSession, Mission, SubjectId } from "@/lib/types";
import { chapterDisplayName, getChapterMeta, getChaptersForProfile } from "@/lib/chapters";
import { dayKey, formatDuration, greetingFor } from "@/lib/format";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ByteStudy — Calm JEE preparation" },
      { name: "description", content: "Track JEE chapters, focus sessions, missions, and study materials in one calm workspace." },
      { property: "og:title", content: "ByteStudy — Calm JEE preparation" },
      { property: "og:description", content: "A calm workspace for JEE chapters, focus sessions, missions, and study materials." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { status } = useAuth();
  if (status === "unauthenticated") return <LandingPage />;
  const navigate = useNavigate();
  const [profile] = useProfile();
  const [metaMap] = useChapterMeta();
  const [customizations] = useChapterCustomizations();
  const [missions, setMissions] = useMissions();
  const [sessions] = useSessions();

  const chapters = useMemo(
    () => (profile ? getChaptersForProfile(profile.classLevel, customizations) : []),
    [profile, customizations],
  );

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
      <header className="mb-5">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {greetingFor(hour)}
        </p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">
          {firstName}.
        </h1>
      </header>

      {/* Chapter list — primary section */}
      <SectionHeader
        title="Continue studying"
        subtitle={profile.classLevel === "dropper" ? "Class 11 + 12" : `Class ${profile.classLevel}`}
      />
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

      {/* Missions */}
      <SectionHeader
        title="Today's missions"
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
                chapterName={cn ? chapterDisplayName(cn, metaMap, customizations) : undefined}
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

      {/* Pomodoro / new mission quick actions */}
      <SectionHeader title="Focus" />
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate({ to: "/focus" })}
          className="card-surface flex items-center gap-3 p-4 text-left transition-transform active:scale-[0.98]"
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
          className="card-surface flex items-center gap-3 p-4 text-left transition-transform active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-elevated-strong text-foreground">
            <Plus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">New mission</div>
            <div className="text-xs text-muted-foreground">Plan a chapter</div>
          </div>
        </button>
      </div>

      {/* Progress summary */}
      <SectionHeader title="Today" />
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

      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatCard
          label="Streak"
          value={
            <span className="flex items-baseline gap-1">
              {streak}
              <span className="text-sm font-medium text-muted-foreground">days</span>
            </span>
          }
          icon={<Flame className="h-4 w-4 text-warning" />}
        />
        <StatCard
          label="Goal"
          value={`${Math.floor(goalSec / 3600)}h ${(goalSec % 3600) / 60}m`.replace(" 0m", "")}
          hint="Daily target"
        />
      </div>

    </AppShell>
  );
}

function LandingPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] px-6 pb-10 pt-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">B</span>
          ByteStudy
        </div>
        <a href="/auth" className="text-sm font-medium text-primary">Sign in</a>
      </header>
      <main className="pt-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">JEE preparation, made calmer</p>
        <h1 className="mt-4 text-5xl font-semibold leading-[1.02] tracking-tight">Study steadily.<br />See it compound.</h1>
        <p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">ByteStudy brings your syllabus, focus time, missions, and study library into one quiet place.</p>
        <a href="/auth?mode=signup" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Create your account <ArrowRight className="h-4 w-4" /></a>
        <div className="mt-16 grid grid-cols-2 gap-3">
          <Feature icon={BookOpen} title="Track chapters" text="Know what to learn next." />
          <Feature icon={Timer} title="Protect focus" text="Make time visible." />
          <Feature icon={Target} title="Plan missions" text="Turn goals into steps." />
          <Feature icon={Sparkles} title="Study library" text="Open your entitled material." />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof BookOpen; title: string; text: string }) {
  return <div className="card-surface p-4"><Icon className="h-5 w-5 text-primary" /><div className="mt-8 text-sm font-semibold">{title}</div><div className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</div></div>;
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
