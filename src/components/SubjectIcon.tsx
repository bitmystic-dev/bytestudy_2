import { Atom, FlaskConical, Sigma } from "lucide-react";
import type { SubjectId } from "@/lib/types";

export const SUBJECT_ICON: Record<SubjectId, typeof Atom> = {
  physics: Atom,
  chemistry: FlaskConical,
  mathematics: Sigma,
};

export function SubjectIcon({ subject, className }: { subject: SubjectId; className?: string }) {
  const Icon = SUBJECT_ICON[subject];
  return <Icon className={className} />;
}
