import Link from "next/link";
import { AlarmClock, ArrowRight, Moon, Pencil, Sun } from "lucide-react";
import type { SleepSession } from "@/lib/types";
import { moodLabel } from "@/lib/types";
import { formatClock, formatDuration, longDayLabel, minuteOfDay } from "@/lib/time";
import { sleepDayOf } from "@/lib/stats";
import { MoodIcon } from "./MoodIcon";
import { DeleteButton } from "./DeleteButton";

export function SessionList({ sessions, tz }: { sessions: SleepSession[]; tz: string }) {
  if (!sessions.length) {
    return (
      <div className="card grid place-items-center gap-2 p-10 text-center">
        <Moon className="size-10 text-night" aria-hidden />
        <p className="font-semibold text-ink">Aún no hay registros</p>
        <p className="text-sm text-muted">Añade la primera siesta o noche con el formulario.</p>
      </div>
    );
  }
  const groups = new Map<string, SleepSession[]>();
  for (const s of sessions) {
    const k = sleepDayOf(s.kind, Date.parse(s.sleepStart), tz);
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([day, items]) => {
        const total = items.reduce(
          (a, s) => a + (s.sleepEnd ? (Date.parse(s.sleepEnd) - Date.parse(s.sleepStart)) / 60_000 : 0),
          0,
        );
        return (
          <section key={day} aria-labelledby={`d-${day}`}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 id={`d-${day}`} className="text-sm font-semibold capitalize text-ink-2">
                {longDayLabel(day)}
              </h3>
              <span className="text-xs text-muted">Total {formatDuration(total)}</span>
            </div>
            <ul className="space-y-2">
              {[...items].reverse().map((s) => (
                <SessionItem key={s.id} s={s} tz={tz} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function SessionItem({ s, tz }: { s: SleepSession; tz: string }) {
  const start = Date.parse(s.sleepStart);
  const end = s.sleepEnd ? Date.parse(s.sleepEnd) : null;
  const routine = s.routineStart ? (start - Date.parse(s.routineStart)) / 60_000 : null;
  const night = s.kind === "night";
  const clock = (t: number) => formatClock(minuteOfDay(t, tz));
  return (
    <li className="card flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-2xl ${night ? "bg-night/15 text-night" : "bg-nap/15 text-nap"}`}
        title={night ? "Noche" : "Siesta"}
      >
        {night ? <Moon className="size-5" aria-hidden /> : <Sun className="size-5" aria-hidden />}
        <span className="sr-only">{night ? "Noche" : "Siesta"}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 font-semibold text-ink">
          <span>
            {clock(start)} <ArrowRight className="inline size-3.5 text-muted" aria-label="hasta" /> {end ? clock(end) : "…"}
          </span>
          {end ? (
            <span className="text-sm font-medium text-ink-2">· {formatDuration((end - start) / 60_000)}</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-indigo-100">
              <span className="size-1.5 animate-pulse rounded-full bg-indigo-300" aria-hidden /> Durmiendo
            </span>
          )}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {routine != null && <span>Rutina {formatDuration(routine)}</span>}
          <span className="inline-flex items-center gap-1" title="Humor antes → después">
            <MoodIcon value={s.moodBefore} className="size-4" />
            <span className="sr-only">Antes: {moodLabel(s.moodBefore)}.</span>
            <ArrowRight className="size-3" aria-hidden />
            <MoodIcon value={s.moodAfter} className="size-4" />
            <span className="sr-only">Después: {moodLabel(s.moodAfter)}.</span>
          </span>
          {s.accompaniment.map((a) => (
            <span key={a} className="rounded-full border border-line px-2 py-0.5">
              {a}
            </span>
          ))}
        </p>
        {s.notes && <p className="mt-1 truncate text-xs italic text-muted">{s.notes}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!end && (
          <Link
            href={`/registro?editar=${s.id}&despertar=1#formulario`}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary/20 px-3 text-xs font-semibold text-indigo-100 transition hover:bg-primary/30"
          >
            <AlarmClock className="size-4" aria-hidden /> Despertó
          </Link>
        )}
        <Link
          href={`/registro?editar=${s.id}#formulario`}
          className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-white/5 hover:text-ink"
          aria-label="Editar registro"
        >
          <Pencil className="size-4" aria-hidden />
        </Link>
        <DeleteButton id={s.id} />
      </div>
    </li>
  );
}
