import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  X,
  Check,
  MessageCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useProfile, useAiPersonalization } from "@/hooks/useCloud";
import { useStore } from "@/hooks/useStore";
import { aiChat } from "@/lib/ai.functions";
import type { AiPersonalization } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "AI Mentor — BytePrep" },
      {
        name: "description",
        content: "Your personal JEE mentor: strategies, doubts, motivation.",
      },
    ],
  }),
  component: AiPage,
});

// ---------- Personalization flow spec ----------

type StepKey =
  | "prepFeeling"
  | "prepStarted"
  | "prepStartedHow"
  | "syllabusCovered"
  | "blockers"
  | "productiveTime"
  | "mentoringStyle"
  | "weekdayHours"
  | "weekendHours"
  | "testsPattern"
  | "recentScores"
  | "scoreRange";

interface StepDef {
  key: StepKey;
  title: string;
  subtitle?: string;
  options: string[];
  multi?: { max: number };
  allowOther?: boolean; // free-text for "Other"
  otherKey?: keyof AiPersonalization;
  // Conditional: only show if predicate returns true
  showIf?: (p: AiPersonalization) => boolean;
}

const STEPS: StepDef[] = [
  {
    key: "prepFeeling",
    title: "How has your preparation been recently?",
    subtitle: "No judgement — this shapes how I coach you.",
    options: [
      "Going really well",
      "Pretty good",
      "It's been inconsistent",
      "I'm struggling to keep up",
      "I'm starting from behind",
    ],
  },
  {
    key: "prepStarted",
    title: "When did you begin preparing seriously?",
    options: [
      "Less than 1 month ago",
      "1–3 months ago",
      "3–6 months ago",
      "6–12 months ago",
      "More than a year ago",
    ],
  },
  {
    key: "prepStartedHow",
    title: "How did you begin?",
    options: ["Coaching", "Self-study", "Both"],
  },
  {
    key: "syllabusCovered",
    title: "How much of your syllabus is already covered?",
    options: [
      "Just getting started",
      "Around 25%",
      "Around 50%",
      "Around 75%",
      "Almost completed",
    ],
  },
  {
    key: "blockers",
    title: "What usually stops you from studying?",
    subtitle: "Pick up to two.",
    multi: { max: 2 },
    options: [
      "I get distracted",
      "I procrastinate",
      "I don't know where to start",
      "I have too much backlog",
      "I lose motivation",
      "School / Coaching takes most of my time",
      "I overthink planning",
      "Something else",
    ],
  },
  {
    key: "productiveTime",
    title: "When are you usually the most productive?",
    options: [
      "Early Morning",
      "Morning",
      "Afternoon",
      "Evening",
      "Late Night",
      "It changes every day",
    ],
  },
  {
    key: "mentoringStyle",
    title: "Which mentoring style suits you best?",
    subtitle: "I'll match my tone to this.",
    options: [
      "Short & direct",
      "Detailed explanations",
      "Step-by-step guidance",
      "Push me harder",
      "Encourage me",
    ],
  },
  {
    key: "weekdayHours",
    title: "On weekdays, how many hours do you usually study?",
    options: ["Less than 2", "2–4", "4–6", "6–8", "More than 8"],
  },
  {
    key: "weekendHours",
    title: "On weekends, how many hours do you usually study?",
    options: ["Less than 2", "2–4", "4–6", "6–8", "More than 8"],
  },
  {
    key: "testsPattern",
    title: "How are tests conducted in your coaching?",
    subtitle: "I'll remember this permanently.",
    allowOther: true,
    otherKey: "testsPatternCustom",
    options: [
      "I don't have regular tests",
      "Weekly tests",
      "Minor tests every few weeks",
      "Monthly tests",
      "Other",
    ],
  },
  {
    key: "recentScores",
    title: "How have your recent test scores been?",
    options: [
      "Excellent",
      "Good",
      "Average",
      "Below expectations",
      "Poor",
      "I haven't taken a test yet",
    ],
  },
  {
    key: "scoreRange",
    title: "Roughly what percentage do you usually score?",
    subtitle: "Optional — helps me calibrate advice.",
    options: ["Below 30%", "30–50%", "50–70%", "70–85%", "Above 85%"],
    showIf: (p) => p.recentScores !== "I haven't taken a test yet",
  },
];

// ---------- Chat message type ----------

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const EMPTY_MESSAGES: ChatMessage[] = [];

// ---------- Page ----------

function AiPage() {
  const [profile] = useProfile();
  const [personalization, setPersonalization, personalizationLoading] = useAiPersonalization();
  const [messages, setMessages] = useStore<ChatMessage[]>(
    "byteprep:ai:messages:v2",
    EMPTY_MESSAGES,
  );
  const [editing, setEditing] = useState(false);
  const [flowStarted, setFlowStarted] = useState(false);
  const [beginning, setBeginning] = useState(false);
  const [beginError, setBeginError] = useState<string | undefined>();

  // Reset the "started" flag whenever cloud state transitions to a completed/skipped state
  useEffect(() => {
    if (personalization.completedAt || personalization.skipped) setFlowStarted(false);
  }, [personalization.completedAt, personalization.skipped]);

  const showWelcome =
    !flowStarted &&
    !personalization.completedAt &&
    !personalization.skipped &&
    !editing;
  const showFlow =
    editing || flowStarted || (!showWelcome && !personalization.completedAt);

  const handleBegin = useCallback(() => {
    if (beginning || flowStarted) return;
    setBeginError(undefined);
    setBeginning(true);
    try {
      setFlowStarted(true);
      // Also persist skipped:false in the background so future sessions
      // don't get stuck at Welcome after a refresh.
      setPersonalization((p) => ({ ...p, skipped: false }));
    } catch (e) {
      setFlowStarted(false);
      setBeginError((e as Error)?.message ?? "Something went wrong. Try again.");
    } finally {
      setBeginning(false);
    }
  }, [beginning, flowStarted, setPersonalization]);

  const handleSkip = useCallback(() => {
    setPersonalization((p) => ({
      ...p,
      skipped: true,
      completedAt: Date.now(),
    }));
  }, [setPersonalization]);

  return (
    <AppShell className="flex min-h-dvh flex-col px-0 pt-0 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="safe-top px-5 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-primary ring-1 ring-primary/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">Mentor</h1>
            <p className="text-[11px] text-muted-foreground">
              Personal JEE coach · {profile?.name?.split(" ")[0] ?? "friend"}
            </p>
          </div>
          {personalization.completedAt && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground active:scale-95"
              aria-label="Edit preferences"
            >
              Edit
            </button>
          )}
          {personalization.completedAt && !editing && messages.length > 0 && (
            <button
              onClick={() => {
                if (!confirm("Clear this conversation?")) return;
                setMessages([]);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-muted-foreground"
              aria-label="Clear chat"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {personalizationLoading && !flowStarted && !personalization.completedAt ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : showWelcome ? (
        <Welcome
          onBegin={handleBegin}
          onSkip={handleSkip}
          loading={beginning}
          error={beginError}
        />
      ) : showFlow ? (
        <PersonalizeFlow
          initial={personalization.data}
          isEdit={editing}
          onCancel={() => {
            setEditing(false);
            setFlowStarted(false);
          }}
          onDone={(data) => {
            setPersonalization({
              data,
              completedAt: Date.now(),
              skipped: false,
            });
            setEditing(false);
            setFlowStarted(false);
          }}
        />
      ) : (
        <Chat
          messages={messages}
          setMessages={setMessages}
          personalization={personalization.data}
          profile={
            profile
              ? {
                  name: profile.name,
                  classLevel: profile.classLevel,
                  targetYear: profile.targetYear,
                  coaching: profile.coaching,
                  dailyGoalMinutes: profile.dailyGoalMinutes,
                  instituteTestsPattern: profile.instituteTestsPattern,
                }
              : undefined
          }
          onStartPersonalize={() => {
            setFlowStarted(true);
            setPersonalization((p) => ({ ...p, skipped: false, completedAt: null }));
          }}
          wasSkipped={personalization.skipped}
        />
      )}
    </AppShell>
  );
}


// ---------- Welcome ----------

function Welcome({ onBegin, onSkip }: { onBegin: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center px-6 pb-10 pt-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/40 to-primary/10 text-primary ring-1 ring-primary/40">
        <Sparkles className="h-7 w-7" />
      </div>
      <h2 className="mt-6 text-center text-[26px] font-semibold leading-tight tracking-tight">
        Meet your JEE mentor.
      </h2>
      <p className="mx-auto mt-3 max-w-xs text-center text-[14.5px] leading-relaxed text-muted-foreground">
        I'll coach you like a senior who cracked JEE. First, a few quick taps so I
        actually know how to help you.
      </p>

      <div className="mt-10 space-y-2.5">
        <button
          onClick={onBegin}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]"
        >
          Let's Begin <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onSkip}
          className="h-12 w-full rounded-full bg-white/[0.04] text-[14px] font-medium text-muted-foreground ring-1 ring-white/10 active:scale-[0.99]"
        >
          Skip for Now
        </button>
      </div>
      <p className="mx-auto mt-4 max-w-xs text-center text-[11px] text-muted-foreground">
        You can complete this later — I'll ask before diving deeper.
      </p>
    </div>
  );
}

// ---------- Personalize flow ----------

function PersonalizeFlow({
  initial,
  isEdit,
  onDone,
  onCancel,
}: {
  initial: AiPersonalization;
  isEdit: boolean;
  onDone: (p: AiPersonalization) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<AiPersonalization>(initial);
  const visible = useMemo(
    () => STEPS.filter((s) => !s.showIf || s.showIf(draft)),
    [draft],
  );
  const [step, setStep] = useState(0);
  const current = visible[Math.min(step, visible.length - 1)];
  const progress = ((step + 1) / visible.length) * 100;

  const [otherText, setOtherText] = useState("");

  useEffect(() => {
    // If user changes an earlier answer that hides current step, clamp.
    if (step >= visible.length) setStep(visible.length - 1);
  }, [visible.length, step]);

  const commitAndNext = (next: AiPersonalization) => {
    setDraft(next);
    setOtherText("");
    if (step >= visible.length - 1) {
      onDone(next);
    } else {
      setStep((s) => s + 1);
    }
  };

  const pickSingle = (value: string) => {
    const next = { ...draft, [current.key]: value } as AiPersonalization;
    // Clear "otherKey" if switching away from "Other"
    if (current.allowOther && current.otherKey && value !== "Other") {
      (next as Record<string, unknown>)[current.otherKey] = undefined;
    }
    // If picking "Other" and there is text, save it now
    if (current.allowOther && current.otherKey && value === "Other" && otherText.trim()) {
      (next as Record<string, unknown>)[current.otherKey] = otherText.trim();
    }
    commitAndNext(next);
  };

  const toggleMulti = (value: string) => {
    const currentList =
      (draft[current.key as keyof AiPersonalization] as string[] | undefined) ?? [];
    const has = currentList.includes(value);
    let next: string[];
    if (has) next = currentList.filter((v) => v !== value);
    else {
      const max = current.multi?.max ?? 99;
      next = currentList.length >= max ? currentList : [...currentList, value];
    }
    setDraft((d) => ({ ...d, [current.key]: next }));
  };

  const back = () => {
    if (step === 0) {
      if (isEdit) onCancel();
      return;
    }
    setStep((s) => s - 1);
  };

  const currentValue = draft[current.key as keyof AiPersonalization];
  const canContinueMulti =
    current.multi && Array.isArray(currentValue) && currentValue.length > 0;

  return (
    <div className="flex flex-1 flex-col px-5 pt-5">
      <div className="mb-2 flex items-center gap-3">
        <button
          onClick={back}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-muted-foreground active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {isEdit && (
          <button
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-muted-foreground active:scale-95"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-6 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {step + 1} of {visible.length}
      </div>
      <h2 className="mt-1 text-[22px] font-semibold leading-snug tracking-tight">
        {current.title}
      </h2>
      {current.subtitle && (
        <p className="mt-2 text-[13.5px] text-muted-foreground">{current.subtitle}</p>
      )}

      <div className="mt-6 space-y-2.5">
        {current.options.map((opt) => {
          const selected = current.multi
            ? Array.isArray(currentValue) && currentValue.includes(opt)
            : currentValue === opt;
          return (
            <button
              key={opt}
              onClick={() => (current.multi ? toggleMulti(opt) : pickSingle(opt))}
              className={cn(
                "group flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left text-[15px] font-medium transition-all active:scale-[0.99]",
                selected
                  ? "border-primary/50 bg-primary/[0.1] text-foreground"
                  : "border-white/10 bg-white/[0.03] text-foreground hover:border-primary/30 hover:bg-primary/[0.05]",
              )}
            >
              <span className="flex-1">{opt}</span>
              {current.multi ? (
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/20",
                  )}
                >
                  {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
              ) : (
                <ArrowRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    selected
                      ? "text-primary translate-x-0.5"
                      : "text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {current.allowOther && current.otherKey && currentValue === "Other" && (
        <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/[0.05] p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-primary">
            Tell me more
          </div>
          <textarea
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            rows={2}
            placeholder="Describe how tests work in your coaching…"
            className="mt-1 w-full resize-none bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}

      {current.multi && (
        <button
          disabled={!canContinueMulti}
          onClick={() => commitAndNext(draft)}
          className={cn(
            "mt-6 h-12 w-full rounded-full text-[15px] font-semibold transition-colors",
            canContinueMulti
              ? "bg-primary text-primary-foreground"
              : "bg-white/[0.05] text-muted-foreground",
          )}
        >
          Continue
        </button>
      )}

      {current.allowOther && currentValue === "Other" && (
        <button
          disabled={!otherText.trim()}
          onClick={() => {
            const next = { ...draft } as Record<string, unknown>;
            next[current.otherKey as string] = otherText.trim();
            commitAndNext(next as AiPersonalization);
          }}
          className={cn(
            "mt-3 h-12 w-full rounded-full text-[15px] font-semibold transition-colors",
            otherText.trim()
              ? "bg-primary text-primary-foreground"
              : "bg-white/[0.05] text-muted-foreground",
          )}
        >
          Save & continue
        </button>
      )}
    </div>
  );
}

// ---------- Chat ----------

function Chat({
  messages,
  setMessages,
  personalization,
  profile,
  onStartPersonalize,
  wasSkipped,
}: {
  messages: ChatMessage[];
  setMessages: (u: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  personalization: AiPersonalization;
  profile?: {
    name: string;
    classLevel: string;
    targetYear: number;
    coaching: string;
    dailyGoalMinutes: number;
    instituteTestsPattern: string;
  };
  onStartPersonalize: () => void;
  wasSkipped: boolean;
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const send = useServerFn(aiChat);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const suggestions = useMemo(() => {
    if (messages.length > 0) return [];
    const base = [
      "Build me a study plan for this week",
      "How should I revise before my next test?",
      "I'm feeling stuck — help me reset",
    ];
    if (personalization.blockers?.includes("I procrastinate")) {
      base.unshift("How do I stop procrastinating today?");
    }
    if (personalization.syllabusCovered === "Just getting started") {
      base.unshift("Where do I start when I'm behind?");
    }
    return base.slice(0, 4);
  }, [messages.length, personalization]);

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput("");
    setError(null);
    const userMsg: ChatMessage = {
      role: "user",
      content: trimmed,
      id: `u-${Date.now()}`,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setSending(true);
    try {
      const res = await send({
        data: {
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          profile,
          personalization,
        },
      });
      const aiMsg: ChatMessage = {
        role: "assistant",
        content: res.content || "I couldn't come up with a reply — try again?",
        id: `a-${Date.now()}`,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 pt-4">
        {messages.length === 0 && (
          <div className="mt-2 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
            <div className="text-[15px] font-medium leading-relaxed">
              Hey{profile?.name ? ` ${profile.name.split(" ")[0]}` : ""} — I'm your BytePrep mentor.
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {wasSkipped
                ? "You skipped setup. That's fine — I'll ask you a few things naturally. Or tap Edit up top to finish setup properly."
                : "I remember your setup. Pick a prompt below or ask me anything."}
            </p>
            {wasSkipped && (
              <button
                onClick={onStartPersonalize}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-[12px] font-medium text-primary active:scale-95"
              >
                Finish setup <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}

        {sending && (
          <div className="flex items-center gap-1.5 py-1 pl-1">
            <Dot delay={0} />
            <Dot delay={150} />
            <Dot delay={300} />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-200">
            {error}
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[12px] font-medium text-muted-foreground transition-colors active:text-foreground hover:border-primary/40 hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="mt-2 flex items-end gap-2 px-5 pt-2"
      >
        <div className="flex flex-1 items-end rounded-2xl bg-white/[0.05] px-4 py-2.5 ring-1 ring-white/10 focus-within:ring-primary/40">
          <MessageCircle className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            placeholder="Ask your mentor…"
            className="max-h-32 flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all active:scale-95",
            input.trim() && !sending
              ? "bg-primary text-primary-foreground"
              : "bg-white/5 text-muted-foreground",
          )}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      {/* Small unused import placeholder to keep Link available for future edit flows */}
      <span className="hidden">
        <Link to="/profile">profile</Link>
      </span>
    </div>
  );
}

function MessageBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-[14.5px] leading-relaxed text-primary-foreground">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-[92%] whitespace-pre-wrap text-[14.5px] leading-relaxed text-foreground">
      {content}
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
