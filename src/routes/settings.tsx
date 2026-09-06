import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import {
  ChevronLeft,
  Bell,
  Download,
  Upload,
  Shield,
  Info,
  ListTree,
  ChevronRight,
  Calendar,
  KeyRound,
  Palette,
  Sun,
  Moon,
  Monitor,
  RotateCcw,
} from "lucide-react";
import {
  useTheme,
  THEMES,
  MODES,
  ACCENTS,
  RADII,
  ACCENT_LABELS,
  type ThemeName,
  type ThemeMode,
  type AccentName,
  type RadiusName,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ByteStudy" },
      { name: "description", content: "Manage your ByteStudy appearance, account, and chapters." },
      { property: "og:title", content: "Settings — ByteStudy" },
      { property: "og:description", content: "Manage your ByteStudy appearance, account, and chapters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const THEME_LABELS: Record<ThemeName, { label: string; hint: string }> = {
  calm: { label: "Calm", hint: "Light, airy, widget-style" },
      { label: "Classic", hint: "The original dark ByteStudy" },
};

const MODE_ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const RADIUS_LABELS: Record<RadiusName, string> = {
  compact: "Compact",
  soft: "Soft",
  round: "Round",
};

function SettingsPage() {
  const { theme, mode, accent, radius, setPrefs, reset } = useTheme();

  return (
    <AppShell hideNav>
      <header className="mb-6 flex items-center gap-3">
        <Link
          to="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      </header>

      {/* ---------------- Appearance ---------------- */}
      <SectionHeader
        title="Appearance"
        subtitle="Applies instantly across the app"
        action={
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-full bg-elevated px-2.5 py-1 text-[11px] text-muted-foreground active:scale-95"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        }
      />

      <div className="card-surface space-y-5 p-4">
        {/* Theme */}
        <div>
          <FieldLabel icon={Palette} label="Theme" />
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => (
              <button
                key={t}
                onClick={() => setPrefs({ theme: t })}
                aria-pressed={theme === t}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.99]",
                  theme === t
                    ? "border-primary/50 bg-primary/10"
                    : "border-hairline bg-elevated",
                )}
              >
                <div className="text-sm font-semibold">{THEME_LABELS[t].label}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {THEME_LABELS[t].hint}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div>
          <FieldLabel icon={Sun} label="Mode" />
          <Segmented
            options={MODES.map((m) => ({ value: m, label: cap(m), icon: MODE_ICONS[m] }))}
            value={mode}
            onChange={(v) => setPrefs({ mode: v as ThemeMode })}
          />
        </div>

        {/* Accent */}
        <div>
          <FieldLabel icon={Palette} label="Accent" />
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a}
                onClick={() => setPrefs({ accent: a })}
                aria-pressed={accent === a}
                aria-label={ACCENT_LABELS[a]}
                data-accent={a}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-all active:scale-95",
                  accent === a ? "ring-2 ring-ring" : "ring-1 ring-hairline",
                )}
              >
                <span className="h-6 w-6 rounded-full bg-primary" />
              </button>
            ))}
          </div>
        </div>

        {/* Radius */}
        <div>
          <FieldLabel icon={Palette} label="Corner radius" />
          <Segmented
            options={RADII.map((r) => ({ value: r, label: RADIUS_LABELS[r] }))}
            value={radius}
            onChange={(v) => setPrefs({ radius: v as RadiusName })}
          />
        </div>

        {/* Preview */}
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
            Preview
          </div>
          <div className="rounded-2xl border border-hairline bg-card p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                B
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Focus block</div>
                <div className="text-[11px] text-muted-foreground">
                  25 min · Physics
                </div>
              </div>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                Done
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Account ---------------- */}
      <SectionHeader title="Account" />
      <div className="card-surface divide-y divide-hairline">
        <Link
          to="/change-password"
          className="flex items-center gap-3 px-4 py-3.5 active:bg-elevated"
        >
          <Tile icon={KeyRound} label="Change password" hint="Set a new sign-in password" />
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </div>

      <SectionHeader title="Chapters" />
      <div className="card-surface divide-y divide-hairline">
        <Link
          to="/manage-chapters"
          className="flex items-center gap-3 px-4 py-3.5 active:bg-elevated"
        >
          <Tile icon={ListTree} label="Manage chapters" hint="Rename, add, delete, reorder" />
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </div>

      <SectionHeader title="Data" />
      <div className="card-surface divide-y divide-hairline">
        <DisabledTile icon={Bell} label="Notifications" hint="Coming soon" />
        <DisabledTile icon={Upload} label="Backup" hint="Coming soon" />
        <DisabledTile icon={Download} label="Import" hint="Coming soon" />
        <DisabledTile icon={Download} label="Export" hint="Coming soon" />
      </div>

      <SectionHeader title="About" />
      <div className="card-surface divide-y divide-hairline">
        <DisabledTile icon={Shield} label="Privacy" hint="Coming soon" />
        <div className="flex items-center gap-3 px-4 py-3.5">
           <Tile icon={Info} label="Version" hint="ByteStudy 0.1.0" />
        </div>
      </div>
    </AppShell>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function FieldLabel({ icon: Icon, label }: { icon: typeof Info; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon?: typeof Info }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-full bg-elevated p-1">
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-medium transition-all",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground active:scale-95",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  hint,
}: {
  icon: typeof Info;
  label: string;
  hint?: string;
}) {
  return (
    <>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-elevated text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </>
  );
}

function DisabledTile({
  icon: Icon,
  label,
  hint,
}: {
  icon: typeof Info;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 opacity-50">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-elevated text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}
