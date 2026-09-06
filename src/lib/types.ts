export type SubjectId = "physics" | "chemistry" | "mathematics";
export type ClassLevel = "11" | "12" | "dropper";
export type Priority = "low" | "medium" | "high";
export type Confidence = 0 | 1 | 2 | 3 | 4 | 5;

export interface Profile {
  name: string;
  exam: "JEE";
  classLevel: ClassLevel;
  targetYear: number;
  coaching: string;
  dailyGoalMinutes: number;
  wakeTime: string; // "06:30"
  sleepTime: string; // "23:00"
  weeklyOffDay: number; // 0-6, Sun=0
  createdAt: number;
}

// ============================================================
// AI Mentor Personalization — persisted server-side. All fields
// optional so partial completions still store safely.
// ============================================================

export interface AiPersonalization {
  // 1. How preparation has been going
  prepFeeling?: string;
  // 2. When they began preparing seriously
  prepStarted?: string;
  prepStartedHow?: string; // Coaching / Self-study / Both
  // 3. Syllabus coverage
  syllabusCovered?: string;
  // 4. Biggest blockers (up to 2)
  blockers?: string[];
  // 5. Most productive time
  productiveTime?: string;
  // 6. Mentoring style
  mentoringStyle?: string;
  // 7. Weekdays
  weekdayFreeSlots?: string[];
  weekdayHours?: string;
  // 8. Weekends
  weekendFreeSlots?: string[];
  weekendHours?: string;
  // 9. Institute tests
  testsPattern?: string; // canonical option
  testsPatternCustom?: string; // free text if "Other"
  // 10. Recent scores
  recentScores?: string;
  scoreRange?: string;
}

export type TestStatus = "upcoming" | "completed" | "missed";

export interface Test {
  id: string;
  name: string;
  testDate: string; // ISO datetime
  subjects: SubjectId[];
  syllabus: string;
  status: TestStatus;
  score?: number;
  maxScore?: number;
  notes: string;
  source: "manual" | "pdf" | "ai";
  createdAt: number;
  updatedAt: number;
}


export interface Mission {
  id: string;
  title: string;
  subject: SubjectId;
  chapterKey?: string; // "11:physics:0"
  priority: Priority;
  dueDate?: string; // ISO date
  notes?: string;
  pinned: boolean;
  completed: boolean;
  completedAt?: number;
  createdAt: number;
}

export interface FocusSession {
  id: string;
  subject?: SubjectId;
  chapterKey?: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  mode: "pomodoro" | "custom";
}

export type CheckpointId =
  | "learned"
  | "revised"
  | "pyqs"
  | "notes"
  | "tests"
  | "shortNotes";

export const CHECKPOINTS: {
  id: CheckpointId;
  label: string;
  hint: string;
  icon: "book" | "refresh" | "clipboard" | "notebook" | "puzzle" | "zap";
}[] = [
  { id: "learned", label: "Learned / Covered", hint: "Chapter fully studied", icon: "book" },
  { id: "revised", label: "Revised", hint: "1st revision done", icon: "refresh" },
  { id: "pyqs", label: "PYQs Done", hint: "Previous year questions", icon: "clipboard" },
  { id: "notes", label: "Notes Made", hint: "Written / digital notes", icon: "notebook" },
  { id: "tests", label: "Test Given", hint: "Chapter test attempted", icon: "puzzle" },
  { id: "shortNotes", label: "Short Notes / Flashcards", hint: "Quick revision ready", icon: "zap" },
];

export type CheckpointMap = Partial<Record<CheckpointId, boolean>>;

export interface ChapterMeta {
  overrideName?: string;
  completion: number; // 0-100 (derived from checkpoints)
  revisionCount: number;
  notes: string;
  confidence: Confidence;
  moduleProgress: number;
  dppProgress: number;
  pyqProgress: number;
  estimatedHours: number;
  actualHours: number;
  lastStudied?: number;
  nextRevision?: number;
  bookmarked: boolean;
  pinned: boolean;
  checkpoints: CheckpointMap;
}

export const DEFAULT_CHAPTER_META: ChapterMeta = {
  completion: 0,
  revisionCount: 0,
  notes: "",
  confidence: 0,
  moduleProgress: 0,
  dppProgress: 0,
  pyqProgress: 0,
  estimatedHours: 0,
  actualHours: 0,
  bookmarked: false,
  pinned: false,
  checkpoints: {},
};

export function checkpointCompletion(cp: CheckpointMap | undefined): number {
  if (!cp) return 0;
  const done = CHECKPOINTS.reduce((n, c) => n + (cp[c.id] ? 1 : 0), 0);
  return Math.round((done / CHECKPOINTS.length) * 100);
}


export const SUBJECT_META: Record<
  SubjectId,
  { label: string; accent: string; ring: string; soft: string; glow: string }
> = {
  physics: {
    label: "Physics",
    accent: "text-physics",
    ring: "stroke-physics",
    soft: "bg-physics/12 text-physics border-physics/25",
    glow: "",
  },
  chemistry: {
    label: "Chemistry",
    accent: "text-chemistry",
    ring: "stroke-chemistry",
    soft: "bg-chemistry/12 text-chemistry border-chemistry/25",
    glow: "",
  },
  mathematics: {
    label: "Mathematics",
    accent: "text-mathematics",
    ring: "stroke-mathematics",
    soft: "bg-mathematics/12 text-mathematics border-mathematics/25",
    glow: "",
  },
};
