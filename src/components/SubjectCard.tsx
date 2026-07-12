import { ChevronRight } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { SUBJECT_META } from "@/lib/types";
import { SubjectIcon } from "./SubjectIcon";
import { ProgressRing } from "./ProgressRing";
import { cn } from "@/lib/utils";

export function SubjectCard({
  subject,
  completion,
  chaptersCount,
  onClick,
}: {
  subject: SubjectId;
  completion: number;
  chaptersCount: number;
  onClick?: () => void;
}) {
  const meta = SUBJECT_META[subject];
  return (
    <button
      onClick={onClick}
      className={cn(
        "card-surface flex w-full items-center gap-4 p-4 text-left transition-all active:scale-[0.99]",
        meta.glow,
      )}
    >
      <ProgressRing value={completion} size={56} stroke={6} ringClassName={meta.ring}>
        <SubjectIcon subject={subject} className={cn("h-5 w-5", meta.accent)} />
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-foreground">{meta.label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {chaptersCount} {chaptersCount === 1 ? "chapter" : "chapters"} · {Math.round(completion)}% complete
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
