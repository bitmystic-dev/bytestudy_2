import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { useProfile, eraseAllUserData } from "@/hooks/useCloud";
import { useAuth } from "@/lib/auth-context";
import type { Profile } from "@/lib/types";
import {
  ChevronRight,
  Cloud,
  Info,
  Pencil,
  LogOut,
  BookOpen,
  BarChart3,
  Calendar,
  Settings as SettingsIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — BytePrep" },
      { name: "description", content: "Your BytePrep profile and study preferences." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [profile, setProfile] = useProfile();
  const { user, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  if (!profile) return <AppShell><div /></AppShell>;

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const handleErase = async () => {
    if (!user) return;
    if (!confirm("Erase ALL your BytePrep data (missions, sessions, chapters, profile)? This cannot be undone.")) return;
    await eraseAllUserData(user.id);
    navigate({ to: "/onboarding", replace: true });
    // Force reload so hooks re-fetch cleanly.
    setTimeout(() => window.location.reload(), 200);
  };

  return (
    <AppShell>
      <header className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary text-xl font-semibold ring-1 ring-primary/30">
          {profile.name.slice(0, 1).toUpperCase() || "B"}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{profile.name}</h1>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            JEE {profile.targetYear} ·{" "}
            {profile.classLevel === "dropper" ? "Dropper" : `Class ${profile.classLevel}`}
            {profile.coaching ? ` · ${profile.coaching}` : ""}
          </p>
          {user?.email && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{user.email}</p>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground active:scale-95"
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </header>

      <SectionHeader title="Study" />
      <div className="card-surface divide-y divide-white/5">
        <Row label="Daily goal" value={`${Math.floor(profile.dailyGoalMinutes / 60)}h ${profile.dailyGoalMinutes % 60}m`} />
        <Row label="Wake time" value={profile.wakeTime} />
        <Row label="Sleep time" value={profile.sleepTime} />
        <Row
          label="Weekly off"
          value={
            ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
              profile.weeklyOffDay
            ]
          }
        />
      </div>

      <SectionHeader title="Chapters" />
      <div className="card-surface">
        <Link
          to="/manage-chapters"
          className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.03]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Manage chapters</div>
            <div className="text-[11px] text-muted-foreground">Rename, add, delete, reorder</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      <SectionHeader title="App" />
      <div className="card-surface divide-y divide-white/5">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
            <Cloud className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Cloud sync</div>
            <div className="text-[11px] text-muted-foreground">On · Data synced to your account</div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-muted-foreground">
            <Info className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Version</div>
            <div className="text-[11px] text-muted-foreground">BytePrep 0.1.0</div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.04] py-3.5 text-sm font-medium ring-1 ring-white/10 active:scale-[0.99]"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
        <button
          onClick={handleErase}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-3.5 text-sm font-medium text-destructive active:scale-[0.99]"
        >
          <Trash2 className="h-4 w-4" /> Erase all data
        </button>
      </div>

      {editing && (
        <EditProfileSheet
          profile={profile}
          onClose={() => setEditing(false)}
          onSave={(p) => {
            setProfile(p);
            setEditing(false);
          }}
        />
      )}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function EditProfileSheet({
  profile,
  onClose,
  onSave,
}: {
  profile: Profile;
  onClose: () => void;
  onSave: (p: Profile) => void;
}) {
  const [draft, setDraft] = useState<Profile>(profile);

  const update = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto w-full max-w-[480px] rounded-t-3xl bg-[var(--surface)] p-5 pb-[max(env(safe-area-inset-bottom),1rem)] ring-1 ring-white/10">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Edit profile</h2>
        <div className="space-y-3">
          <Field label="Name">
            <input
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full bg-transparent text-[15px] outline-none"
            />
          </Field>
          <Field label="Class">
            <div className="flex gap-1.5">
              {(["11", "12", "dropper"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => update("classLevel", v)}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-medium capitalize",
                    draft.classLevel === v ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground",
                  )}
                >
                  {v === "dropper" ? "Dropper" : `Class ${v}`}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Target year">
            <input
              type="number"
              value={draft.targetYear}
              onChange={(e) => update("targetYear", Number(e.target.value))}
              className="w-full bg-transparent text-[15px] outline-none"
            />
          </Field>
          <Field label="Coaching">
            <input
              value={draft.coaching}
              onChange={(e) => update("coaching", e.target.value)}
              placeholder="Optional"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </Field>
          <Field label="Daily goal (min)">
            <input
              type="number"
              min={30}
              max={720}
              step={15}
              value={draft.dailyGoalMinutes}
              onChange={(e) => update("dailyGoalMinutes", Number(e.target.value))}
              className="w-full bg-transparent text-[15px] outline-none"
            />
          </Field>
        </div>
        <button
          onClick={() => onSave(draft)}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-primary-foreground"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl bg-white/[0.04] px-4 py-2.5 ring-1 ring-white/10">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </label>
  );
}
