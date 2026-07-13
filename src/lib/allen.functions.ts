import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================
// ALLEN Integration server functions. Every function is admin-gated:
// we check `profiles.admin_rights = true` for the caller before doing
// anything with ALLEN credentials or sync state.
// ============================================================

async function assertAdmin(supabase: {
  from: (t: string) => {
    select: (s: string) => {
      eq: (
        col: string,
        v: string,
      ) => { maybeSingle: () => Promise<{ data: { admin_rights: boolean } | null }> };
    };
  };
}, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("admin_rights")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.admin_rights) throw new Error("Forbidden");
}

// ---------- Save credentials ----------

const SaveInput = z.object({
  formId: z.string().min(3).max(64),
  password: z.string().min(1).max(200),
});

export const allenSaveCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => SaveInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase.from("allen_credentials").upsert({
      user_id: context.userId,
      form_id: data.formId,
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- Test connection ----------

export const allenTestConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { data: creds, error } = await context.supabase
      .from("allen_credentials")
      .select("form_id, password")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!creds) throw new Error("Save ALLEN credentials first.");

    const { defaultAllenAdapter } = await import("@/lib/allen.server");
    try {
      const session = await defaultAllenAdapter.login(creds.form_id, creds.password);
      return {
        ok: true as const,
        message: session.cookies
          ? "Received a session cookie from ALLEN. Full data sync will activate once the ALLEN sync worker is provisioned."
          : "Reached ALLEN but no session was issued.",
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false as const, message };
    }
  });

// ---------- Run sync (best-effort) ----------

export const allenSyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { data: creds } = await context.supabase
      .from("allen_credentials")
      .select("form_id, password")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!creds) throw new Error("Save ALLEN credentials first.");

    const { defaultAllenAdapter } = await import("@/lib/allen.server");

    const startedAt = new Date().toISOString();
    let status = "success";
    let errorMsg: string | null = null;
    let homeworkAdded = 0;
    let testsAdded = 0;

    try {
      const session = await defaultAllenAdapter.login(creds.form_id, creds.password);

      // Best-effort: these currently throw a controlled "not yet configured" error.
      // Once the worker/endpoints are ready, they will return real data and this
      // block will upsert new items into missions/tests using (source, external_id)
      // to dedupe.
      const [homework, tests] = await Promise.all([
        defaultAllenAdapter
          .listHomework(session)
          .catch(() => [] as Awaited<ReturnType<typeof defaultAllenAdapter.listHomework>>),
        defaultAllenAdapter
          .listTests(session)
          .catch(() => [] as Awaited<ReturnType<typeof defaultAllenAdapter.listTests>>),
      ]);

      for (const hw of homework) {
        const { error } = await context.supabase.from("missions").upsert(
          {
            user_id: context.userId,
            title: hw.title,
            subject: hw.subject,
            priority: "medium",
            due_date: hw.dueDate ?? null,
            notes: hw.notes ?? null,
            pinned: false,
            completed: false,
            source: "allen",
            external_id: hw.externalId,
          },
          { onConflict: "user_id,source,external_id" },
        );
        if (!error) homeworkAdded++;
      }

      for (const t of tests) {
        const { error } = await context.supabase.from("tests").upsert(
          {
            user_id: context.userId,
            name: t.name,
            test_date: t.testDate,
            subjects: t.subjects,
            syllabus: t.syllabus,
            status: "upcoming",
            notes: "",
            source: "allen",
            external_id: t.externalId,
          },
          { onConflict: "user_id,source,external_id" },
        );
        if (!error) testsAdded++;
      }
    } catch (e) {
      status = "error";
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    await context.supabase.from("allen_sync_state").upsert({
      user_id: context.userId,
      last_sync_at: startedAt,
      last_status: status,
      last_error: errorMsg,
    });

    return {
      ok: status === "success",
      status,
      error: errorMsg,
      homeworkAdded,
      testsAdded,
    };
  });
