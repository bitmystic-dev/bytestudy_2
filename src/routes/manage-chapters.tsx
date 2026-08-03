import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Search,
  Plus,
  Trash2,
  Pencil,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  ListTree,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { useProfile, useChapterCustomizations } from "@/hooks/useCloud";
import type { ClassLevel, SubjectId } from "@/lib/types";
import { SUBJECT_META } from "@/lib/types";
import {
  customizationKey,
  getChaptersForSubject,
  getDefaultChapterNames,
  newCustomId,
  type CustomItem,
  type CustomizationMap,
  type SubjectCustomization,
} from "@/lib/chapters";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manage-chapters")({
  head: () => ({
    meta: [
      { title: "Manage Chapters — BytePrep" },
      { name: "description", content: "Rename, add, delete, and reorder your chapters." },
    ],
  }),
  component: ManageChaptersPage,
});

type Scope = { classLevel: 11 | 12; subject: SubjectId };

const SUBJECTS: SubjectId[] = ["physics", "chemistry", "mathematics"];

function scopesForLevel(level: ClassLevel): Scope[] {
  const classes = level === "11" ? [11] : level === "12" ? [12] : [11, 12];
  const out: Scope[] = [];
  for (const c of classes) for (const s of SUBJECTS) out.push({ classLevel: c as 11 | 12, subject: s });
  return out;
}

// Materialize the "editing" items list for a scope — the customization if
// present, else the raw defaults expanded into items.
function materializeItems(
  scope: Scope,
  customizations: CustomizationMap,
): CustomItem[] {
  const key = customizationKey(scope.classLevel, scope.subject);
  const existing = customizations[key];
  if (existing && existing.items.length > 0) return existing.items.slice();
  const defaults = getDefaultChapterNames(scope.classLevel, scope.subject);
  return defaults.map((_, i) => ({ k: "d" as const, i }));
}

function ManageChaptersPage() {
  const [profile] = useProfile();
  const [customizations, setCustomizations, loading] = useChapterCustomizations();

  const scopes = useMemo<Scope[]>(
    () => (profile ? scopesForLevel(profile.classLevel) : []),
    [profile],
  );

  const [activeSubject, setActiveSubject] = useState<SubjectId>("physics");
  const [activeClass, setActiveClass] = useState<11 | 12>(11);
  const [q, setQ] = useState("");
  const [reorder, setReorder] = useState(false);
  const [renameKey, setRenameKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ item: CustomItem; label: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState<null | "saved">(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync active class if profile changes.
  useEffect(() => {
    if (!profile) return;
    const first = scopes[0];
    if (first) setActiveClass(first.classLevel);
  }, [profile, scopes]);

  const isDropper = profile?.classLevel === "dropper";
  const scope: Scope = { classLevel: activeClass, subject: activeSubject };

  const items = useMemo(
    () => materializeItems(scope, customizations),
    [scope.classLevel, scope.subject, customizations],
  );

  const defaults = useMemo(
    () => getDefaultChapterNames(scope.classLevel, scope.subject),
    [scope.classLevel, scope.subject],
  );

  const chapters = useMemo(
    () => getChaptersForSubject(scope.classLevel, scope.subject, customizations),
    [scope.classLevel, scope.subject, customizations],
  );

  const hiddenDefaults = useMemo(() => {
    const shown = new Set(items.filter((i) => i.k === "d").map((i) => (i as { i: number }).i));
    return defaults
      .map((name, i) => ({ i, name }))
      .filter((d) => !shown.has(d.i));
  }, [items, defaults]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return chapters;
    return chapters.filter((c) => c.defaultName.toLowerCase().includes(ql));
  }, [chapters, q]);

  const persist = (nextItems: CustomItem[]) => {
    setCustomizations((prev) => {
      const key = customizationKey(scope.classLevel, scope.subject);
      const next: CustomizationMap = { ...prev };
      // If nextItems matches raw defaults exactly, delete row so we fall back.
      const isPristine =
        nextItems.length === defaults.length &&
        nextItems.every((it, idx) => it.k === "d" && (it as { i: number }).i === idx && !(it as { n?: string }).n);
      if (isPristine) {
        delete next[key];
      } else {
        const value: SubjectCustomization = { items: nextItems };
        next[key] = value;
      }
      return next;
    });
    flashSaved();
  };

  const flashSaved = () => {
    setSaveFlash("saved");
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSaveFlash(null), 1200);
  };

  // ============= Actions =============

  const rename = (item: CustomItem, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = items.map((it) => {
      if (it.k === "d" && item.k === "d" && it.i === item.i) {
        const defName = defaults[it.i] ?? "";
        if (trimmed === defName) {
          const { n: _drop, ...rest } = it;
          void _drop;
          return { k: "d" as const, i: rest.i };
        }
        return { ...it, n: trimmed };
      }
      if (it.k === "c" && item.k === "c" && it.id === item.id) {
        return { ...it, n: trimmed };
      }
      return it;
    });
    persist(next);
  };

  const restoreDefaultName = (item: CustomItem) => {
    if (item.k !== "d") return;
    const next = items.map((it) => {
      if (it.k === "d" && it.i === item.i) return { k: "d" as const, i: it.i };
      return it;
    });
    persist(next);
  };

  const remove = (item: CustomItem) => {
    const next = items.filter((it) => {
      if (it.k === "d" && item.k === "d") return it.i !== item.i;
      if (it.k === "c" && item.k === "c") return it.id !== item.id;
      return true;
    });
    persist(next);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    persist(next);
  };

  const addChapter = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist([...items, { k: "c", id: newCustomId(), n: trimmed }]);
    setAddOpen(false);
  };

  const restoreDefault = (defIdx: number) => {
    persist([...items, { k: "d", i: defIdx }]);
  };

  const resetSubject = () => {
    if (!confirm(`Reset all ${SUBJECT_META[activeSubject].label} chapters to the original list? Custom chapters will be removed.`)) return;
    setCustomizations((prev) => {
      const next: CustomizationMap = { ...prev };
      delete next[customizationKey(scope.classLevel, scope.subject)];
      return next;
    });
    flashSaved();
  };

  // ============= UI =============

  if (!profile) {
    return (
      <AppShell hideNav>
        <div className="pt-10 text-center text-sm text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  const accent = SUBJECT_META[activeSubject].accent;
  const soft = SUBJECT_META[activeSubject].soft;

  return (
    <AppShell hideNav>
      <header className="mb-4 flex items-center gap-3">
        <Link
          to="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Manage chapters</h1>
          <p className="text-[11px] text-muted-foreground">
            Changes sync to your account.{" "}
            {saveFlash === "saved" && <span className="text-success">Saved</span>}
          </p>
        </div>
        <button
          onClick={() => setReorder((v) => !v)}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium",
            reorder ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground",
          )}
        >
          <ListTree className="h-4 w-4" />
          {reorder ? "Done" : "Reorder"}
        </button>
      </header>

      {/* Subject tabs */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSubject(s)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-xs font-medium transition-all",
              activeSubject === s
                ? cn("border-current", SUBJECT_META[s].soft, SUBJECT_META[s].accent)
                : "border-hairline bg-elevated text-muted-foreground",
            )}
          >
            {SUBJECT_META[s].label}
          </button>
        ))}
      </div>

      {/* Class switcher for droppers */}
      {isDropper && (
        <div className="mb-3 flex gap-2">
          {[11, 12].map((c) => (
            <button
              key={c}
              onClick={() => setActiveClass(c as 11 | 12)}
              className={cn(
                "flex-1 rounded-xl px-3 py-2 text-xs font-medium ring-1",
                activeClass === c
                  ? "bg-primary/15 text-primary ring-primary/40"
                  : "bg-elevated text-muted-foreground ring-hairline",
              )}
            >
              Class {c}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <label className="mb-3 flex items-center gap-2 rounded-2xl bg-elevated px-4 py-3 ring-1 ring-hairline">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search chapters"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      {/* Action row */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setAddOpen(true)}
          className={cn(
            "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-semibold ring-1",
            soft,
          )}
        >
          <Plus className="h-3.5 w-3.5" /> Add chapter
        </button>
        <button
          onClick={resetSubject}
          className="flex h-9 items-center gap-1.5 rounded-full bg-elevated px-3 text-xs font-medium text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      {/* Chapter list */}
      {loading ? (
        <div className="pt-6 text-center text-xs text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={q ? "No matches" : "No chapters yet"}
          description={q ? "Try a different search." : "Add your first chapter to get started."}
          action={
            !q && (
              <button
                onClick={() => setAddOpen(true)}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Add chapter
              </button>
            )
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((ref) => {
            const idx = ref.index;
            const item = items[idx];
            if (!item) return null;
            const isRenaming = renameKey === ref.key;
            const defaultName = ref.isCustom
              ? null
              : defaults[ref.defaultIndex ?? -1] ?? null;
            const isRenamed =
              item.k === "d" &&
              typeof item.n === "string" &&
              item.n.trim().length > 0 &&
              item.n.trim() !== (defaultName ?? "");

            return (
              <li
                key={ref.key}
                className="card-surface flex items-center gap-2 px-3 py-3"
              >
                <span className="w-6 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground">
                  {idx + 1}
                </span>

                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        rename(item, renameValue);
                        setRenameKey(null);
                      } else if (e.key === "Escape") {
                        setRenameKey(null);
                      }
                    }}
                    className="min-w-0 flex-1 rounded-md bg-elevated px-2 py-1.5 text-[14px] outline-none ring-1 ring-primary/40"
                  />
                ) : (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">
                      {ref.defaultName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {ref.isCustom ? (
                        <span className={cn("rounded-sm px-1.5 py-0.5", soft)}>Custom</span>
                      ) : isRenamed ? (
                        <span className="rounded-sm bg-elevated px-1.5 py-0.5">
                          Renamed · was “{defaultName}”
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  {isRenaming ? (
                    <>
                      <button
                        onClick={() => {
                          rename(item, renameValue);
                          setRenameKey(null);
                        }}
                        className={cn("flex h-8 w-8 items-center justify-center rounded-full", accent)}
                        aria-label="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setRenameKey(null)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground"
                        aria-label="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : reorder ? (
                    <>
                      <button
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-muted-foreground disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => move(idx, 1)}
                        disabled={idx === items.length - 1}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-muted-foreground disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setRenameKey(ref.key);
                          setRenameValue(ref.defaultName);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-muted-foreground"
                        aria-label="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {item.k === "d" && isRenamed && (
                        <button
                          onClick={() => restoreDefaultName(item)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-muted-foreground"
                          aria-label="Restore default name"
                          title="Restore default name"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setConfirmDelete({ item, label: ref.defaultName })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Hidden defaults */}
      {hiddenDefaults.length > 0 && !q && (
        <div className="mt-6">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Hidden defaults
          </div>
          <ul className="space-y-2">
            {hiddenDefaults.map((d) => (
              <li
                key={d.i}
                className="flex items-center gap-2 rounded-2xl bg-elevated px-3 py-2.5 ring-1 ring-hairline"
              >
                <div className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                  {d.name}
                </div>
                <button
                  onClick={() => restoreDefault(d.i)}
                  className="flex h-8 items-center gap-1 rounded-full bg-elevated px-3 text-[11px] font-medium text-foreground"
                >
                  <RotateCcw className="h-3 w-3" /> Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add chapter sheet */}
      {addOpen && (
        <AddChapterSheet
          subjectLabel={SUBJECT_META[activeSubject].label}
          onClose={() => setAddOpen(false)}
          onAdd={addChapter}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmSheet
          title="Delete chapter?"
          description={
            confirmDelete.item.k === "d"
              ? `"${confirmDelete.label}" will be hidden from your list. You can restore it later from "Hidden defaults".`
              : `"${confirmDelete.label}" is a custom chapter and will be removed permanently.`
          }
          confirmLabel="Delete"
          destructive
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            remove(confirmDelete.item);
            setConfirmDelete(null);
          }}
        />
      )}
    </AppShell>
  );
}

function AddChapterSheet({
  subjectLabel,
  onClose,
  onAdd,
}: {
  subjectLabel: string;
  onClose: () => void;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto w-full max-w-[480px] rounded-t-3xl bg-[var(--surface)] p-5 pb-[max(env(safe-area-inset-bottom),1rem)] ring-1 ring-hairline">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-elevated-strong" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            New {subjectLabel.toLowerCase()} chapter
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onAdd(name);
          }}
          placeholder="Chapter name"
          className="w-full rounded-2xl bg-elevated px-4 py-3.5 text-[15px] outline-none ring-1 ring-hairline placeholder:text-muted-foreground focus:ring-primary/50"
        />
        <button
          disabled={!name.trim()}
          onClick={() => onAdd(name)}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
        >
          Add chapter
        </button>
      </div>
    </div>
  );
}

function ConfirmSheet({
  title,
  description,
  confirmLabel,
  destructive,
  onClose,
  onConfirm,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto w-full max-w-[480px] rounded-t-3xl bg-[var(--surface)] p-5 pb-[max(env(safe-area-inset-bottom),1rem)] ring-1 ring-hairline">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-elevated-strong" />
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="h-11 flex-1 rounded-full bg-elevated text-sm font-medium text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "h-11 flex-1 rounded-full text-sm font-semibold",
              destructive
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
