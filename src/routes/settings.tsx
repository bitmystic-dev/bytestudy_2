import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { ChevronLeft, Bell, Download, Upload, Shield, Info, ListTree, ChevronRight } from "lucide-react";

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
          to="/manage-chapters"
          className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.03]"
        >
          <Tile icon={ListTree} label="Manage chapters" hint="Rename, add, delete, reorder" />
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
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
