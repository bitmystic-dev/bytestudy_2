import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Target,
  Clock,
  Building2,
  Moon,
  Sun,
  Sparkles,
} from "lucide-react";
import { useProfile } from "@/hooks/useCloud";
import type { ClassLevel, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — BytePrep" },
      { name: "description", content: "Set up your BytePrep study profile." },
    ],
  }),
  component: OnboardingPage,
});

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Draft {
  name: string;
  classLevel: ClassLevel | "";
  targetYear: number;
  coaching: string;
  dailyGoalMinutes: number;
  wakeTime: string;
  sleepTime: string;
  weeklyOffDay: number;
  instituteTestsPattern: string;
}

const emptyDraft: Draft = {
  name: "",
  classLevel: "",
  targetYear: new Date().getFullYear() + 1,
  coaching: "",
  dailyGoalMinutes: 240,
  wakeTime: "06:30",
  sleepTime: "23:00",
  weeklyOffDay: 0,
  instituteTestsPattern: "",
};

const TEST_CADENCE_PRESETS = [
  "Weekly minor tests, monthly major tests covering full syllabus.",
  "Fortnightly minor tests, monthly major tests, quarterly full-length tests.",
  "Two minor tests every week, one full-length test each Sunday.",
  "Only monthly major tests — no minor tests.",
];

function OnboardingPage() {
  const [, setProfile] = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const totalSteps = 6;

  const update = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const canContinue = (() => {
    switch (step) {
      case 0:
        return draft.name.trim().length >= 1;
      case 1:
        return draft.classLevel !== "";
      case 2:
        return draft.targetYear >= 2024 && draft.targetYear <= 2035;
      case 3:
        return true; // coaching optional
      case 4:
        return draft.dailyGoalMinutes >= 30;
      case 5:
        return !!draft.wakeTime && !!draft.sleepTime;
      case 6:
        return draft.instituteTestsPattern.trim().length >= 10;
      default:
        return true;
    }
  })();

  const next = () => {
    if (step < totalSteps - 1) return setStep((s) => s + 1);
    if (draft.classLevel === "") return;
    const profile: Profile = {
      name: draft.name.trim(),
      exam: "JEE",
      classLevel: draft.classLevel,
      targetYear: draft.targetYear,
      coaching: draft.coaching.trim(),
      dailyGoalMinutes: draft.dailyGoalMinutes,
      wakeTime: draft.wakeTime,
      sleepTime: draft.sleepTime,
      weeklyOffDay: draft.weeklyOffDay,
      createdAt: Date.now(),
      instituteTestsPattern: draft.instituteTestsPattern.trim(),
    };
    setProfile(profile);
    navigate({ to: "/", replace: true });
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-8 pt-[max(env(safe-area-inset-top),1.25rem)]">
      <div className="mb-8 mt-4 flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all",
              i <= step ? "bg-primary" : "bg-white/10",
            )}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col">
        {step === 0 && (
          <Step title="What should we call you?" subtitle="This is how we'll greet you every day.">
            <input
              autoFocus
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Your name"
              className="mt-2 w-full rounded-2xl bg-white/5 px-5 py-4 text-lg font-medium outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/50"
            />
          </Step>
        )}

        {step === 1 && (
          <Step title="Where are you right now?" subtitle="Preparing for JEE.">
            <div className="mt-2 grid grid-cols-1 gap-2">
              {(["11", "12", "dropper"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => update("classLevel", v)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-5 py-4 text-left text-[15px] transition-all",
                    draft.classLevel === v
                      ? "border-primary/60 bg-primary/10"
                      : "border-white/10 bg-white/[0.03]",
                  )}
                >
                  <span className="font-medium">
                    {v === "dropper" ? "Dropper" : `Class ${v}`}
                  </span>
                  {v === "dropper" && (
                    <span className="text-xs text-muted-foreground">Class 11 + 12</span>
                  )}
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step title="Target attempt year?" subtitle="The year you appear for JEE." icon={Target}>
            <input
              type="number"
              value={draft.targetYear}
              min={2024}
              max={2035}
              onChange={(e) => update("targetYear", Number(e.target.value))}
              className="mt-2 w-full rounded-2xl bg-white/5 px-5 py-4 text-lg font-medium outline-none ring-1 ring-white/10 focus:ring-primary/50"
            />
          </Step>
        )}

        {step === 3 && (
          <Step title="Coaching institute?" subtitle="Optional. Helps us use your syllabus naming." icon={Building2}>
            <input
              value={draft.coaching}
              onChange={(e) => update("coaching", e.target.value)}
              placeholder="e.g. Allen, FIITJEE, Self-study"
              className="mt-2 w-full rounded-2xl bg-white/5 px-5 py-4 text-[15px] outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/50"
            />
          </Step>
        )}

        {step === 4 && (
          <Step
            title="Daily study goal"
            subtitle="A number you can hit on most days beats a number that guilts you."
            icon={Clock}
          >
            <div className="mt-4">
              <div className="text-center text-5xl font-semibold tracking-tight">
                {Math.floor(draft.dailyGoalMinutes / 60)}h{" "}
                {draft.dailyGoalMinutes % 60 > 0 ? `${draft.dailyGoalMinutes % 60}m` : ""}
              </div>
              <input
                type="range"
                min={30}
                max={720}
                step={15}
                value={draft.dailyGoalMinutes}
                onChange={(e) => update("dailyGoalMinutes", Number(e.target.value))}
                className="mt-6 w-full accent-primary"
              />
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>30m</span>
                <span>12h</span>
              </div>
            </div>
          </Step>
        )}

        {step === 5 && (
          <Step title="Your rhythm" subtitle="We use this only to keep your day human." icon={Moon}>
            <div className="mt-2 space-y-3">
              <TimeField icon={Sun} label="Wake time" value={draft.wakeTime} onChange={(v) => update("wakeTime", v)} />
              <TimeField icon={Moon} label="Sleep time" value={draft.sleepTime} onChange={(v) => update("sleepTime", v)} />
              <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Weekly off day</div>
                <div className="flex gap-1.5">
                  {days.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => update("weeklyOffDay", i)}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
                        draft.weeklyOffDay === i
                          ? "bg-primary/20 text-primary"
                          : "bg-white/5 text-muted-foreground",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Step>
        )}

        {step === 6 && (
          <Step
            title="How does your institute test?"
            subtitle="Describe the rhythm of your minor and major tests. BytePrep AI uses this to personalise recommendations."
            icon={Sparkles}
          >
            <textarea
              autoFocus
              rows={5}
              value={draft.instituteTestsPattern}
              onChange={(e) => update("instituteTestsPattern", e.target.value)}
              placeholder="e.g. Every alternate Monday we have minor tests. Monthly major tests cover the entire syllabus."
              className="mt-2 w-full resize-none rounded-2xl bg-white/5 px-5 py-4 text-[15px] leading-relaxed outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary/50"
            />
            <div className="mt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Or pick a preset
            </div>
            <div className="mt-2 space-y-2">
              {TEST_CADENCE_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => update("instituteTestsPattern", p)}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-left text-[13px] leading-snug transition-all",
                    draft.instituteTestsPattern === p
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </Step>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <button
            onClick={back}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <button
          disabled={!canContinue}
          onClick={next}
          className={cn(
            "flex h-14 flex-1 items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-all active:scale-[0.98]",
            canContinue
              ? "bg-primary text-primary-foreground"
              : "bg-white/5 text-muted-foreground",
          )}
        >
          {step === totalSteps - 1 ? "Let's study" : "Continue"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function Step({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: typeof GraduationCap;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function TimeField({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: typeof Sun;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-[15px] font-medium outline-none"
        />
      </div>
    </label>
  );
}
