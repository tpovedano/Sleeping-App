import { Angry, Frown, Laugh, Meh, Minus, Smile } from "lucide-react";
import { moodLabel } from "@/lib/types";

const ICONS = { 1: Angry, 2: Frown, 3: Meh, 4: Smile, 5: Laugh } as const;
const COLORS = { 1: "text-rose-300", 2: "text-orange-300", 3: "text-slate-300", 4: "text-teal-300", 5: "text-emerald-300" } as const;

export function MoodIcon({ value, className = "size-5" }: { value: number | null | undefined; className?: string }) {
  const v = value != null ? (Math.min(5, Math.max(1, Math.round(value))) as 1 | 2 | 3 | 4 | 5) : null;
  if (!v) return <Minus className={`${className} text-muted`} aria-hidden />;
  const Icon = ICONS[v];
  return <Icon className={`${className} ${COLORS[v]}`} aria-hidden data-label={moodLabel(v)} />;
}
