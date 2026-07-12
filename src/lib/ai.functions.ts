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
