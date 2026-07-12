import class11 from "@/data/class11.json";
import class12 from "@/data/class12.json";
import type { ChapterMeta, ClassLevel, SubjectId } from "./types";
import { DEFAULT_CHAPTER_META } from "./types";

export interface ChapterRef {
  key: string; // "11:physics:0"
  classLevel: 11 | 12;
  subject: SubjectId;
  index: number;
  defaultName: string;
}

const SUBJECTS: SubjectId[] = ["physics", "chemistry", "mathematics"];

export function getChaptersForProfile(level: ClassLevel): ChapterRef[] {
  const buckets = level === "11" ? [class11] : level === "12" ? [class12] : [class11, class12];
  const refs: ChapterRef[] = [];
  for (const bucket of buckets) {
    const cls = bucket.class as 11 | 12;
    for (const subject of SUBJECTS) {
      const list = (bucket.subjects as Record<SubjectId, string[]>)[subject] ?? [];
      list.forEach((name, index) => {
        refs.push({
          key: `${cls}:${subject}:${index}`,
          classLevel: cls,
          subject,
          index,
          defaultName: name,
        });
      });
    }
  }
  return refs;
}

export function chapterDisplayName(
  ref: ChapterRef,
  metaMap: Record<string, Partial<ChapterMeta>>,
): string {
  return metaMap[ref.key]?.overrideName?.trim() || ref.defaultName;
}

export function getChapterMeta(
  key: string,
  metaMap: Record<string, Partial<ChapterMeta>>,
): ChapterMeta {
  return { ...DEFAULT_CHAPTER_META, ...(metaMap[key] ?? {}) };
}

export function parseChapterKey(key: string): { classLevel: 11 | 12; subject: SubjectId; index: number } | null {
  const [c, s, i] = key.split(":");
  if (!c || !s || !i) return null;
  return { classLevel: Number(c) as 11 | 12, subject: s as SubjectId, index: Number(i) };
}
