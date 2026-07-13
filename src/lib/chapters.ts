import class11 from "@/data/class11.json";
import class12 from "@/data/class12.json";
import type { ChapterMeta, ClassLevel, SubjectId } from "./types";
import { DEFAULT_CHAPTER_META } from "./types";

export interface ChapterRef {
  key: string; // "11:physics:0" for defaults, "11:physics:c-<id>" for custom
  classLevel: 11 | 12;
  subject: SubjectId;
  index: number; // display index in the final ordered list
  defaultName: string; // the fallback / default label (custom chapters use their name)
  isCustom: boolean;
  customId?: string;
  defaultIndex?: number; // original index in the JSON list, only for defaults
  important?: boolean; // JSON's `imp === "yes"`
}

type RawChapter = string | { name: string; imp?: string };

const SUBJECTS: SubjectId[] = ["physics", "chemistry", "mathematics"];

// ============================================================
// Customization data model (persisted per user/class/subject)
// ============================================================

export type CustomItem =
  | { k: "d"; i: number; n?: string } // default chapter, i = default index, n = optional rename
  | { k: "c"; id: string; n: string }; // user-created chapter

export type SubjectCustomization = { items: CustomItem[] };

// Keyed by `${classLevel}:${subject}`.
export type CustomizationMap = Record<string, SubjectCustomization>;

export function customizationKey(classLevel: 11 | 12, subject: SubjectId) {
  return `${classLevel}:${subject}`;
}

export function defaultChapterKey(classLevel: 11 | 12, subject: SubjectId, defaultIndex: number) {
  return `${classLevel}:${subject}:${defaultIndex}`;
}

export function customChapterKey(classLevel: 11 | 12, subject: SubjectId, id: string) {
  return `${classLevel}:${subject}:c-${id}`;
}

// Default source-of-truth chapter names for a class+subject.
export function getDefaultChapterNames(classLevel: 11 | 12, subject: SubjectId): string[] {
  return getDefaultChapterEntries(classLevel, subject).map((e) => e.name);
}

export function getDefaultChapterEntries(
  classLevel: 11 | 12,
  subject: SubjectId,
): { name: string; important: boolean }[] {
  const bucket = classLevel === 11 ? class11 : class12;
  const raw = ((bucket.subjects as Record<SubjectId, RawChapter[]>)[subject] ?? []);
  return raw.map((entry) =>
    typeof entry === "string"
      ? { name: entry, important: false }
      : { name: entry.name, important: (entry.imp ?? "").toLowerCase() === "yes" },
  );
}

export function isDefaultChapterImportant(
  classLevel: 11 | 12,
  subject: SubjectId,
  defaultIndex: number,
): boolean {
  return getDefaultChapterEntries(classLevel, subject)[defaultIndex]?.important ?? false;
}

function subjectClasses(level: ClassLevel): (11 | 12)[] {
  if (level === "11") return [11];
  if (level === "12") return [12];
  return [11, 12];
}

// Build the merged, ordered chapter list for a class+subject.
// If no customization exists for that scope, returns the raw defaults.
function buildMergedForSubject(
  classLevel: 11 | 12,
  subject: SubjectId,
  customizations?: CustomizationMap,
): ChapterRef[] {
  const defaults = getDefaultChapterNames(classLevel, subject);
  const custom = customizations?.[customizationKey(classLevel, subject)];

  if (!custom || custom.items.length === 0) {
    // No customization -> raw defaults in original order.
    // NOTE: If the user has explicitly emptied the list, we treat that as
    // "empty" only when the row exists but items is []. Since we return early
    // here when items.length === 0, we opt to fall back to defaults; the
    // manage page should never persist an empty items array — it deletes the
    // row instead when the user wants to reset.
    return defaults.map((name, i) => ({
      key: defaultChapterKey(classLevel, subject, i),
      classLevel,
      subject,
      index: i,
      defaultName: name,
      isCustom: false,
      defaultIndex: i,
    }));
  }

  return custom.items.map((item, i) => {
    if (item.k === "d") {
      const defName = defaults[item.i] ?? "";
      return {
        key: defaultChapterKey(classLevel, subject, item.i),
        classLevel,
        subject,
        index: i,
        defaultName: defName,
        isCustom: false,
        defaultIndex: item.i,
      } satisfies ChapterRef;
    }
    return {
      key: customChapterKey(classLevel, subject, item.id),
      classLevel,
      subject,
      index: i,
      defaultName: item.n,
      isCustom: true,
      customId: item.id,
    } satisfies ChapterRef;
  });
}

export function getChaptersForSubject(
  classLevel: 11 | 12,
  subject: SubjectId,
  customizations?: CustomizationMap,
): ChapterRef[] {
  return buildMergedForSubject(classLevel, subject, customizations);
}

// Full chapter list for a user's profile (class 11/12/dropper), all subjects.
export function getChaptersForProfile(
  level: ClassLevel,
  customizations?: CustomizationMap,
): ChapterRef[] {
  const classes = subjectClasses(level);
  const out: ChapterRef[] = [];
  for (const cls of classes) {
    for (const subject of SUBJECTS) {
      out.push(...buildMergedForSubject(cls, subject, customizations));
    }
  }
  return out;
}

export function chapterDisplayName(
  ref: ChapterRef,
  metaMap: Record<string, Partial<ChapterMeta>>,
  customizations?: CustomizationMap,
): string {
  // Priority: customization rename > chapter_meta override > default/custom name.
  if (customizations && !ref.isCustom && ref.defaultIndex != null) {
    const custom = customizations[customizationKey(ref.classLevel, ref.subject)];
    const item = custom?.items.find(
      (it) => it.k === "d" && it.i === ref.defaultIndex,
    ) as CustomItem | undefined;
    if (item && item.k === "d" && item.n?.trim()) return item.n.trim();
  }
  return metaMap[ref.key]?.overrideName?.trim() || ref.defaultName;
}

export function getChapterMeta(
  key: string,
  metaMap: Record<string, Partial<ChapterMeta>>,
): ChapterMeta {
  return { ...DEFAULT_CHAPTER_META, ...(metaMap[key] ?? {}) };
}

export function parseChapterKey(
  key: string,
): { classLevel: 11 | 12; subject: SubjectId; isCustom: boolean; index?: number; customId?: string } | null {
  const parts = key.split(":");
  if (parts.length !== 3) return null;
  const [c, s, tail] = parts;
  if (!c || !s || !tail) return null;
  const classLevel = Number(c) as 11 | 12;
  const subject = s as SubjectId;
  if (tail.startsWith("c-")) {
    return { classLevel, subject, isCustom: true, customId: tail.slice(2) };
  }
  const idx = Number(tail);
  if (Number.isNaN(idx)) return null;
  return { classLevel, subject, isCustom: false, index: idx };
}

// Generate a short random id for custom chapters.
export function newCustomId(): string {
  // 10 hex chars — plenty of entropy per subject/user.
  const bytes = new Uint8Array(5);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
