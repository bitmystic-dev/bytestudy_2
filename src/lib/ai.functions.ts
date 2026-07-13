import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================
// AI server functions. Thin wrappers around src/lib/ai.server.ts
// so call sites stay provider-agnostic. Every function is
// authenticated; we never expose a public AI endpoint.
// ============================================================

const StudyProfileInput = z.object({
  instituteTests: z.string().min(1).max(4000),
  extras: z.string().max(4000).optional(),
});

export const aiAnalyzeStudyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => StudyProfileInput.parse(v))
  .handler(async ({ data }) => {
    const { aiCompleteJson } = await import("@/lib/ai.server");
    const result = await aiCompleteJson<{
      pattern: string;
      cadence: string;
      recommendations: string[];
    }>({
      messages: [
        {
          role: "system",
          content:
            "You are a JEE study coach. Given how a student's institute runs its tests, return JSON with keys: pattern (short summary), cadence (weekly/biweekly/monthly), recommendations (3-5 short bullet strings).",
        },
        {
          role: "user",
          content: `Institute test pattern:\n${data.instituteTests}${
            data.extras ? `\n\nAdditional context:\n${data.extras}` : ""
          }`,
        },
      ],
    });
    return result;
  });

const InsightsInput = z.object({
  subject: z.enum(["physics", "chemistry", "mathematics"]),
  chapters: z
    .array(
      z.object({
        name: z.string(),
        completion: z.number(),
        confidence: z.number(),
        revisions: z.number(),
      }),
    )
    .min(1)
    .max(60),
});

export const aiSubjectInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => InsightsInput.parse(v))
  .handler(async ({ data }) => {
    if (data.chapters.filter((c) => c.completion >= 0.8).length < 4) {
      return {
        ready: false as const,
        message:
          "Complete at least 4 chapters in this subject to unlock personalised insights.",
      };
    }
    const { aiCompleteJson } = await import("@/lib/ai.server");
    const result = await aiCompleteJson<{
      strengths: string[];
      weaknesses: string[];
      nextFocus: string[];
    }>({
      messages: [
        {
          role: "system",
          content:
            "You are an analytical JEE coach. Given per-chapter progress for a subject, return JSON: { strengths: string[], weaknesses: string[], nextFocus: string[] }. Keep each item under 90 chars.",
        },
        {
          role: "user",
          content: JSON.stringify({
            subject: data.subject,
            chapters: data.chapters,
          }),
        },
      ],
    });
    return { ready: true as const, ...result };
  });

// ============================================================
// AI Chat — free-form conversation with a JEE mentor persona.
// The client passes the full prior message array on every call
// so the model stays stateless. Profile context is stitched into
// a system prompt server-side so we don't leak keys or prompts.
// ============================================================

const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(6000),
      }),
    )
    .min(1)
    .max(40),
  profile: z
    .object({
      name: z.string().optional(),
      classLevel: z.string().optional(),
      targetYear: z.number().optional(),
      coaching: z.string().optional(),
      dailyGoalMinutes: z.number().optional(),
      instituteTestsPattern: z.string().optional(),
    })
    .optional(),
  personalization: z
    .object({
      prepFeeling: z.string().optional(),
      prepStarted: z.string().optional(),
      prepStartedHow: z.string().optional(),
      syllabusCovered: z.string().optional(),
      blockers: z.array(z.string()).optional(),
      productiveTime: z.string().optional(),
      mentoringStyle: z.string().optional(),
      weekdayFreeSlots: z.array(z.string()).optional(),
      weekdayHours: z.string().optional(),
      weekendFreeSlots: z.array(z.string()).optional(),
      weekendHours: z.string().optional(),
      testsPattern: z.string().optional(),
      testsPatternCustom: z.string().optional(),
      recentScores: z.string().optional(),
      scoreRange: z.string().optional(),
    })
    .optional(),
});

export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ChatInput.parse(v))
  .handler(async ({ data }) => {
    const { aiComplete } = await import("@/lib/ai.server");

    const p = data.profile ?? {};
    const per = data.personalization ?? {};

    const profileBlock = [
      p.name ? `Name: ${p.name}` : null,
      p.classLevel ? `Class: ${p.classLevel}` : null,
      p.targetYear ? `Target JEE year: ${p.targetYear}` : null,
      p.coaching ? `Coaching: ${p.coaching}` : null,
      p.dailyGoalMinutes ? `Daily study goal: ${p.dailyGoalMinutes} min` : null,
      p.instituteTestsPattern
        ? `Institute test pattern: ${p.instituteTestsPattern}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const testsPattern =
      per.testsPattern === "Other" && per.testsPatternCustom
        ? per.testsPatternCustom
        : per.testsPattern;

    const personalBlock = [
      per.prepFeeling ? `Prep vibe: ${per.prepFeeling}` : null,
      per.prepStarted ? `Started prep: ${per.prepStarted}` : null,
      per.prepStartedHow ? `Prep mode: ${per.prepStartedHow}` : null,
      per.syllabusCovered ? `Syllabus covered: ${per.syllabusCovered}` : null,
      per.blockers?.length ? `Blockers: ${per.blockers.join(", ")}` : null,
      per.productiveTime ? `Most productive: ${per.productiveTime}` : null,
      per.mentoringStyle ? `Preferred mentoring style: ${per.mentoringStyle}` : null,
      per.weekdayFreeSlots?.length
        ? `Weekday free slots: ${per.weekdayFreeSlots.join(", ")}`
        : null,
      per.weekdayHours ? `Weekday hours/day: ${per.weekdayHours}` : null,
      per.weekendFreeSlots?.length
        ? `Weekend free slots: ${per.weekendFreeSlots.join(", ")}`
        : null,
      per.weekendHours ? `Weekend hours/day: ${per.weekendHours}` : null,
      testsPattern ? `Institute tests: ${testsPattern}` : null,
      per.recentScores ? `Recent test scores: ${per.recentScores}` : null,
      per.scoreRange ? `Typical score range: ${per.scoreRange}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const system = [
      "You are BytePrep — a warm, sharp, personal JEE mentor.",
      "You are NOT a generic chatbot. You speak like a senior who has cracked JEE and now coaches this student one-on-one.",
      "Be concise (usually 2-5 short paragraphs or a compact list). Skip filler and disclaimers.",
      "Never re-ask information you already have. Use it directly.",
      "Prefer concrete, actionable advice: names of chapters, hours, techniques, timelines.",
      "When motivating, be genuine and specific — not corny.",
      profileBlock ? `Student profile:\n${profileBlock}` : null,
      personalBlock ? `Personalization:\n${personalBlock}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await aiComplete({
      messages: [
        { role: "system", content: system },
        ...data.messages,
      ],
      temperature: 0.8,
      maxTokens: 1200,
    });
    return { content: result.content };
  });
