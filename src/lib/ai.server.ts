// ============================================================
// AI service abstraction. Provider-agnostic surface so we can
// swap MiniMax/NVIDIA out later without touching call sites.
// Server-only: reads NVIDIA_API_KEY from process.env. Never
// import this from a client-reachable module scope; import it
// inside a server function handler with `await import(...)` if
// needed.
// ============================================================

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiCompletionOptions {
  messages: AiMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  model?: string;
}

export interface AiCompletionResult {
  content: string;
  model: string;
  raw?: unknown;
}

const DEFAULT_MODEL = "minimaxai/minimax-m2.7";
const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";

export async function aiComplete(
  opts: AiCompletionOptions,
): Promise<AiCompletionResult> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error(
      "AI provider not configured. Missing NVIDIA_API_KEY on the server.",
    );
  }
  const model = opts.model ?? DEFAULT_MODEL;
  const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      top_p: opts.topP ?? 0.95,
      max_tokens: opts.maxTokens ?? 4096,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI provider error ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  return { content, model, raw: json };
}

/**
 * Ask the model to return strict JSON. Retries once on parse failure.
 */
export async function aiCompleteJson<T = unknown>(
  opts: AiCompletionOptions,
): Promise<T> {
  const wrapped: AiCompletionOptions = {
    ...opts,
    messages: [
      ...opts.messages,
      {
        role: "system",
        content:
          "Respond ONLY with valid JSON. No prose, no code fences, no commentary.",
      },
    ],
    temperature: opts.temperature ?? 0.3,
  };
  const { content } = await aiComplete(wrapped);
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error("AI returned invalid JSON.");
  }
}
