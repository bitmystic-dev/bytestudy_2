import { CheckCircle2, Circle, Pin, Flag } from "lucide-react";
import type { Mission } from "@/lib/types";
import { SUBJECT_META } from "@/lib/types";
import { SubjectIcon } from "./SubjectIcon";
import { cn } from "@/lib/utils";

const priorityStyles = {
  low: "text-muted-foreground",
  medium: "text-amber-300",
  high: "text-rose-300",
};

export function MissionCard({
  mission,
  onToggle,
  onPin,
  onClick,
  chapterName,
}: {
  mission: Mission;
  onToggle: () => void;
  onPin: () => void;
  onClick?: () => void;
  chapterName?: string;
}) {
  const meta = SUBJECT_META[mission.subject];
  return (
    <div
      className={cn(
        "card-surface group flex items-start gap-3 p-4 transition-all active:scale-[0.99]",
        mission.completed && "opacity-60",
      )}
    >
      <button
        onClick={onToggle}
        aria-label={mission.completed ? "Mark incomplete" : "Mark complete"}
        className="mt-0.5 shrink-0 rounded-full p-0.5 active:scale-90"
      >
        {mission.completed ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
        ) : (
          <Circle className="h-6 w-6 text-muted-foreground" />
        )}
      </button>
      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <div
          className={cn(
            "truncate text-[15px] font-medium leading-snug text-foreground",
            mission.completed && "line-through",
          )}
        >
          {mission.title}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5", meta.soft)}>
            <SubjectIcon subject={mission.subject} className="h-3 w-3" />
            {meta.label}
          </span>
          {chapterName && (
            <span className="truncate rounded-full bg-white/5 px-2 py-0.5 text-muted-foreground">
              {chapterName}
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1", priorityStyles[mission.priority])}>
            <Flag className="h-3 w-3" />
            {mission.priority}
          </span>
          {mission.dueDate && (
            <span className="text-muted-foreground">
              {new Date(mission.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </button>
      <button
        onClick={onPin}
        aria-label={mission.pinned ? "Unpin" : "Pin"}
        className={cn(
          "shrink-0 rounded-full p-1.5 text-muted-foreground active:scale-90",
          mission.pinned && "text-primary",
        )}
      >
        <Pin className={cn("h-4 w-4", mission.pinned && "fill-current")} />
      </button>
    </div>
  );
}
