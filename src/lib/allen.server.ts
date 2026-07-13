// ============================================================
// ALLEN Portal adapter — server-only.
//
// This is intentionally modular. We attempt a best-effort fetch-based
// login against the ALLEN student portal. Because the real portal
// typically involves JS-rendered login, CSRF cookies, and sometimes
// CAPTCHA, this adapter is designed to be swapped out later for a
// headless-browser worker or a supported API without changing the
// callers in `allen.functions.ts`.
// ============================================================

export interface AllenAuthedSession {
  cookies: string;
  studentId?: string;
}

export interface AllenHomeworkItem {
  externalId: string;
  title: string;
  subject: "physics" | "chemistry" | "mathematics";
  chapterHint?: string;
  dueDate?: string;
  notes?: string;
}

export interface AllenTestItem {
  externalId: string;
  name: string;
  testDate: string; // ISO
  subjects: ("physics" | "chemistry" | "mathematics")[];
  syllabus: string;
}

export interface AllenAdapter {
  login(formId: string, password: string): Promise<AllenAuthedSession>;
  listHomework(session: AllenAuthedSession): Promise<AllenHomeworkItem[]>;
  listTests(session: AllenAuthedSession): Promise<AllenTestItem[]>;
}

// ---------------- Default fetch-based adapter ----------------
// Uses a well-known ALLEN student portal endpoint. If the real
// portal moves or changes shape, replace this implementation.

const BASE = process.env.ALLEN_BASE_URL || "https://www.allen.ac.in";
const LOGIN_PATH = process.env.ALLEN_LOGIN_PATH || "/apps/student-login.aspx";

async function attemptLogin(
  formId: string,
  password: string,
): Promise<AllenAuthedSession> {
  // Best-effort: try a form-encoded POST.
  const url = BASE + LOGIN_PATH;
  const body = new URLSearchParams();
  body.set("formId", formId);
  body.set("password", password);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "BytePrepBot/1.0",
    },
    body: body.toString(),
    redirect: "manual",
  });

  const cookies = res.headers.get("set-cookie") ?? "";
  if (!cookies) {
    throw new Error(
      "ALLEN login endpoint did not return a session cookie. The portal likely requires JavaScript / CAPTCHA. Configure a headless worker adapter.",
    );
  }
  return { cookies };
}

export const defaultAllenAdapter: AllenAdapter = {
  async login(formId, password) {
    return attemptLogin(formId, password);
  },
  async listHomework(_session) {
    // Not yet wired to a real endpoint.
    throw new Error(
      "ALLEN homework endpoint not configured yet. This will be enabled once the sync worker is deployed.",
    );
  },
  async listTests(_session) {
    throw new Error(
      "ALLEN tests endpoint not configured yet. This will be enabled once the sync worker is deployed.",
    );
  },
};
