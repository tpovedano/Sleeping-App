"use client";

import { Angry, Frown, Laugh, Meh, Smile, type LucideIcon } from "lucide-react";
import { MOODS } from "@/lib/types";

export const MOOD_ICONS: Record<number, LucideIcon> = { 1: Angry, 2: Frown, 3: Meh, 4: Smile, 5: Laugh };

const TINT: Record<number, string> = {
  1: "data-[on=true]:border-rose-400/70 data-[on=true]:bg-rose-400/15 data-[on=true]:text-rose-200",
  2: "data-[on=true]:border-orange-400/70 data-[on=true]:bg-orange-400/15 data-[on=true]:text-orange-200",
  3: "data-[on=true]:border-slate-300/60 data-[on=true]:bg-slate-300/10 data-[on=true]:text-slate-100",
  4: "data-[on=true]:border-teal-400/70 data-[on=true]:bg-teal-400/15 data-[on=true]:text-teal-200",
  5: "data-[on=true]:border-emerald-400/70 data-[on=true]:bg-emerald-400/15 data-[on=true]:text-emerald-200",
};

export function MoodPicker({
  name,
  legend,
  value,
  onChange,
  disabled,
  hint,
}: {
  name: string;
  legend: string;
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0 disabled:opacity-40">
      <legend className="mb-2 text-sm font-medium text-ink-2">{legend}</legend>
      <div role="radiogroup" aria-label={legend} className="grid grid-cols-5 gap-2">
        {MOODS.map((m) => {
          const Icon = MOOD_ICONS[m.value];
          const on = value === m.value;
          return (
            <label
              key={m.value}
              data-on={on}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-line bg-white/[0.03] px-1 py-2.5 text-muted transition hover:border-line-strong hover:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-300 ${TINT[m.value]} ${disabled ? "cursor-not-allowed" : ""}`}
            >
              <input
                type="radio"
                name={name}
                value={m.value}
                checked={on}
                onChange={() => onChange(m.value)}
                className="sr-only"
              />
              <Icon className="size-6" aria-hidden />
              <span className="text-center text-[11px] font-semibold leading-tight">{m.label}</span>
            </label>
          );
        })}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}
