import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { useStore } from "@/hooks/useStore";
import { KEYS } from "@/lib/storage";
import type { ChapterMeta } from "@/lib/types";
import { ChevronLeft, RotateCcw, Bell, Download, Upload, Shield, Info, HardDrive } from "lucide-react";

const EMPTY_META: Record<string, Partial<ChapterMeta>> = {};

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BytePrep" },
      { name: "description", content: "BytePrep app settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [metaMap, setMetaMap] = useStore<Record<string, Partial<ChapterMeta>>>(
    KEYS.chapterMeta,
    EMPTY_META,
  );

  const overrideCount = Object.values(metaMap).filter((v) => v?.overrideName?.trim()).length;

  const resetAllNames = () => {
    if (!confirm(`Reset ${overrideCount} chapter name${overrideCount === 1 ? "" : "s"} to defaults?`)) return;
    setMetaMap((prev) => {
      const next: Record<string, Partial<ChapterMeta>> = {};
      for (const [k, v] of Object.entries(prev)) {
        // Strip overrideName, keep everything else
        const { overrideName: _drop, ...rest } = v;
        void _drop;
        if (Object.keys(rest).length > 0) next[k] = rest;
      }
      return next;
    });
  };

  return (
    <AppShell hideNav>
      <header className="mb-6 flex items-center gap-3">
        <Link
          to="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      </header>

      <SectionHeader title="Chapters" />
      <div className="card-surface divide-y divide-white/5">
        <Link
          to="/subjects/$subject"
          params={{ subject: "physics" }}
          className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.03]"
        >
          <Tile icon={HardDrive} label="Rename chapter names" hint="Per-chapter overrides" />
        </Link>
        <button
          disabled={overrideCount === 0}
          onClick={resetAllNames}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.03] disabled:opacity-40"
        >
          <Tile icon={RotateCcw} label="Reset chapter names" hint={`${overrideCount} custom name${overrideCount === 1 ? "" : "s"}`} />
        </button>
      </div>

      <SectionHeader title="Data" />
      <div className="card-surface divide-y divide-white/5">
        <DisabledTile icon={Bell} label="Notifications" hint="Coming soon" />
        <DisabledTile icon={Upload} label="Backup" hint="Coming soon" />
        <DisabledTile icon={Download} label="Import" hint="Coming soon" />
        <DisabledTile icon={Download} label="Export" hint="Coming soon" />
      </div>

      <SectionHeader title="About" />
      <div className="card-surface divide-y divide-white/5">
        <DisabledTile icon={Shield} label="Privacy" hint="Coming soon" />
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Tile icon={Info} label="Version" hint="BytePrep 0.1.0" />
        </div>
      </div>
    </AppShell>
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
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-muted-foreground">
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
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}
