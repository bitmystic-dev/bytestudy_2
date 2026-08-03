import { useMemo, useState } from "react";
import { Search, X, Check, BookOpen } from "lucide-react";
import type { ChapterRef } from "@/lib/chapters";
import { chapterDisplayName, type CustomizationMap } from "@/lib/chapters";
import type { ChapterMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

// ============================================================
// Custom checkbox-style single-select chapter picker.
// Renders as an inline "trigger" button that opens a themed
// bottom sheet. No native <select>. One chapter can be
// selected at a time; selecting again clears it.
// ============================================================

interface Props {
  value?: string;
  onChange: (chapterKey: string | undefined) => void;
  chapters: ChapterRef[];
  metaMap: Record<string, Partial<ChapterMeta>>;
  customizations?: CustomizationMap;
  /** Optional label shown when nothing is selected. */
  placeholder?: string;
  /** Optional: show a "None" option so users can clear. Default true. */
  allowClear?: boolean;
  /** Whether to prefix "Class 11 / Class 12" for droppers. */
  showClassPrefix?: boolean;
}

export function ChapterPicker({
  value,
  onChange,
  chapters,
  metaMap,
  customizations,
  placeholder = "Select a chapter",
  allowClear = true,
  showClassPrefix = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selectedRef = useMemo(
    () => chapters.find((c) => c.key === value),
    [chapters, value],
  );

  const displayValue = selectedRef
    ? chapterDisplayName(selectedRef, metaMap, customizations)
    : null;

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return chapters;
    return chapters.filter((c) =>
      chapterDisplayName(c, metaMap, customizations)
        .toLowerCase()
        .includes(ql),
    );
  }, [chapters, q, metaMap, customizations]);

  const close = () => {
    setOpen(false);
    setQ("");
  };

  const pick = (key: string | undefined) => {
    onChange(key);
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl bg-elevated px-4 py-3.5 text-left text-[14px] outline-none ring-1 transition-colors",
          selectedRef
            ? "ring-primary/40 text-foreground"
            : "ring-hairline text-muted-foreground hover:ring-hairline",
        )}
      >
        <BookOpen className="h-4 w-4 shrink-0 opacity-70" />
        <span className="min-w-0 flex-1 truncate">
          {displayValue ?? placeholder}
        </span>
        {selectedRef && allowClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            aria-label="Clear"
            className="rounded-full p-1 text-muted-foreground hover:bg-elevated"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-overlay backdrop-blur-sm"
            onClick={close}
          />
          <div className="relative mx-auto flex max-h-[80vh] w-full max-w-[480px] flex-col rounded-t-3xl bg-[var(--surface)] pb-[max(env(safe-area-inset-bottom),1rem)] ring-1 ring-hairline animate-in slide-in-from-bottom">
            <div className="px-5 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-elevated-strong" />
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">
                  Select chapter
                </h2>
                <button
                  onClick={close}
                  aria-label="Close"
                  className="rounded-full p-1.5 text-muted-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <label className="flex items-center gap-2 rounded-2xl bg-elevated px-4 py-3 ring-1 ring-hairline">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {q && (
                  <button onClick={() => setQ("")} aria-label="Clear search">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </label>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto px-5 pb-4">
              {allowClear && (
                <button
                  type="button"
                  onClick={() => pick(undefined)}
                  className={cn(
                    "mb-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ring-1 transition-colors",
                    !value
                      ? "bg-primary/10 ring-primary/40"
                      : "bg-elevated ring-hairline hover:ring-hairline",
                  )}
                >
                  <RadioDot selected={!value} />
                  <span className="text-[14px] font-medium text-muted-foreground">
                    None
                  </span>
                </button>
              )}

              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No matches
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {filtered.map((c) => {
                    const selected = c.key === value;
                    const name = chapterDisplayName(c, metaMap, customizations);
                    return (
                      <li key={c.key}>
                        <button
                          type="button"
                          onClick={() => pick(c.key)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ring-1 transition-colors",
                            selected
                              ? "bg-primary/10 ring-primary/40"
                              : "bg-elevated ring-hairline hover:ring-hairline",
                          )}
                        >
                          <RadioDot selected={selected} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[14px] font-medium">
                              {name}
                            </div>
                            {showClassPrefix && (
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Class {c.classLevel} · {c.subject}
                              </div>
                            )}
                          </div>
                          {c.isCustom && (
                            <span className="rounded-md bg-elevated px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                              Custom
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
        selected
          ? "border-primary bg-primary/20"
          : "border-hairline bg-transparent",
      )}
      aria-hidden="true"
    >
      {selected && <Check className="h-3 w-3 text-primary" strokeWidth={3} />}
    </span>
  );
}
