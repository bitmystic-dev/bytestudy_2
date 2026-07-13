import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, ArrowRight, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/hooks/useCloud";
import { useStore } from "@/hooks/useStore";
import { aiChat } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "AI Mentor — BytePrep" },
      { name: "description", content: "Your personal JEE mentor: strategies, doubts, motivation." },
    ],
  }),
  component: AiPage,
});

// ---------------- Personalization data model ----------------

interface Personalization {
  studyStyle?: string;
  biggestStruggle?: string;
  strongSubject?: string;
  weakSubject?: string;
  hoursPerDay?: string;
  motivationTrigger?: string;
  instituteTestsPattern?: string;
  completedAt?: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const EMPTY_PERSONALIZATION: Personalization = {};
const EMPTY_MESSAGES: ChatMessage[] = [];

// ---------------- Personalization prompts ----------------

type PromptStep = {
  key: keyof Personalization;
  question: string;
  options: string[];
  allowSkip?: boolean;
};

const PROMPTS: PromptStep[] = [
  {
    key: "studyStyle",
    question: "How do you learn best?",
    options: [
      "Watching video lectures",
      "Reading textbook + notes",
      "Solving problems first",
      "Group discussions",
    ],
  },
  {
    key: "hoursPerDay",
    question: "Realistically, how many focused hours can you put in daily?",
    options: ["2-3 hours", "4-5 hours", "6-7 hours", "8+ hours"],
  },
  {
    key: "strongSubject",
    question: "Which subject feels most comfortable right now?",
    options: ["Physics", "Chemistry", "Mathematics", "None of them yet"],
  },
  {
    key: "weakSubject",
    question: "Which one keeps you up at night?",
    options: ["Physics", "Chemistry", "Mathematics", "All of them"],
  },
  {
    key: "biggestStruggle",
    question: "What's your biggest struggle right now?",
    options: [
      "Understanding concepts",
      "Retention & revision",
      "Solving JEE-level problems",
      "Consistency & motivation",
    ],
  },
  {
    key: "motivationTrigger",
    question: "What actually gets you to sit down and study?",
    options: [
      "A clear plan for the day",
      "Fear of falling behind",
      "Seeing progress numbers",
      "Studying with a friend",
    ],
  },
];

// ---------------- Page ----------------

function AiPage() {
  const [profile] = useProfile();
  const [personalization, setPersonalization] = useStore<Personalization>(
    "byteprep:ai:personalization",
    EMPTY_PERSONALIZATION,
  );
  const [messages, setMessages] = useStore<ChatMessage[]>(
    "byteprep:ai:messages",
    EMPTY_MESSAGES,
  );

  const showPersonalization = !personalization.completedAt;

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
          {!showPersonalization && messages.length > 0 && (
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

      {showPersonalization ? (
        <Personalize
          onDone={(p) =>
            setPersonalization({ ...p, completedAt: Date.now() })
          }
        />
      ) : (
        <Chat
          messages={messages}
          setMessages={setMessages}
          personalization={personalization}
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
        />
      )}
    </AppShell>
  );
}

// ---------------- Personalization flow ----------------

function Personalize({ onDone }: { onDone: (p: Personalization) => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Personalization>({});
  const current = PROMPTS[step];
  const isLast = step === PROMPTS.length - 1;

  const pick = (v: string) => {
    const next = { ...draft, [current.key]: v };
    setDraft(next);
    if (isLast) onDone(next);
    else setStep((s) => s + 1);
  };

  return (
    <div className="flex-1 px-5 pt-5">
      <div className="mb-6 flex items-center gap-2">
        {PROMPTS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all",
              i <= step ? "bg-primary" : "bg-white/10",
            )}
          />
        ))}
      </div>

      <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {step + 1} of {PROMPTS.length}
      </div>
      <h2 className="text-[22px] font-semibold leading-snug tracking-tight">
        {current.question}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        No wrong answer — this stays between us and shapes how I coach you.
      </p>

      <div className="mt-6 space-y-2.5">
        {current.options.map((opt) => (
          <button
            key={opt}
            onClick={() => pick(opt)}
            className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left text-[15px] font-medium transition-all active:scale-[0.99] hover:border-primary/40 hover:bg-primary/[0.06]"
          >
            <span className="flex-1">{opt}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </div>

      {step > 0 && (
        <button
          onClick={() => setStep((s) => s - 1)}
          className="mt-6 text-sm text-muted-foreground active:text-foreground"
        >
          ← Back
        </button>
      )}
    </div>
  );
}

// ---------------- Chat ----------------

function Chat({
  messages,
  setMessages,
  personalization,
  profile,
}: {
  messages: ChatMessage[];
  setMessages: (u: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  personalization: Personalization;
  profile?: {
    name: string;
    classLevel: string;
    targetYear: number;
    coaching: string;
    dailyGoalMinutes: number;
    instituteTestsPattern: string;
  };
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

  const suggestions = useMemo(
    () =>
      messages.length === 0
        ? [
            "Build me a study plan for next week",
            personalization.weakSubject
              ? `How do I get better at ${personalization.weakSubject}?`
              : "How do I improve my weakest subject?",
            "Give me a mindset reset — I'm feeling stuck",
            "How should I revise before my next test?",
          ]
        : [],
    [messages.length, personalization.weakSubject],
  );

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
          personalization: {
            studyStyle: personalization.studyStyle,
            biggestStruggle: personalization.biggestStruggle,
            strongSubject: personalization.strongSubject,
            weakSubject: personalization.weakSubject,
            hoursPerDay: personalization.hoursPerDay,
            motivationTrigger: personalization.motivationTrigger,
          },
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
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-5 pt-4"
      >
        {messages.length === 0 && (
          <div className="mt-2 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
            <div className="text-[15px] font-medium leading-relaxed">
              Hey{profile?.name ? ` ${profile.name.split(" ")[0]}` : ""} — I'm your BytePrep mentor.
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Ask me anything about your JEE prep — strategies, doubts, revision plans, or a mindset reset.
            </p>
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
    </div>
  );
}

function MessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
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
