import Link from "next/link";
import { AlarmClock, ArrowRight, Clock, Eye, MapPin, Milk, Moon, Pencil, Sun, XCircle } from "lucide-react";
import type { SleepSession } from "@/lib/types";
import { moodLabel, neededHelp } from "@/lib/types";
import { formatClock, formatDuration, longDayLabel, minuteOfDay } from "@/lib/time";
import { sleepDayOf } from "@/lib/stats";
import { MoodIcon } from "./MoodIcon";
import { DeleteButton } from "./DeleteButton";

const sleptMin = (s: SleepSession) =>
  s.failed || !s.sleepEnd
    ? 0
    : (Date.parse(s.sleepEnd) - Date.parse(s.sleepStart)) / 60_000 - s.wakings.reduce((a, w) => a + w.durationMin, 0);

export function SessionList({ sessions, tz }: { sessions: SleepSession[]; tz: string }) {
  if (!sessions.length) {
    return (
      <div className="card grid place-items-center gap-2 p-10 text-center">
        <Moon className="size-10 text-night" aria-hidden />
        <p className="font-semibold text-ink">Aún no hay registros</p>
        <p className="text-sm text-muted">Empieza registrando la noche y después las siestas.</p>
      </div>
    );
  }
  const groups = new Map<string, SleepSession[]>();
  for (const s of sessions) {
    const k = sleepDayOf(s.kind, Date.parse(s.sleepStart), tz);
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  return (
    <div className="min-w-0 space-y-6">
      {[...groups.entries()].map(([day, items]) => {
        const total = items.reduce((a, s) => a + sleptMin(s), 0);
        return (
          <section key={day} aria-labelledby={`d-${day}`} className="min-w-0">
            <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
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
  const awake = s.wakings.reduce((a, w) => a + w.durationMin, 0);
  const helped = s.wakings.filter(neededHelp).length;
  const milk = s.wakings.filter((w) => w.milk).length;
  return (
    <li className={`card flex min-w-0 items-start gap-3 p-3 sm:gap-4 sm:p-4 ${s.failed ? "border-dashed" : ""}`}>
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
          s.failed ? "bg-white/5 text-muted" : night ? "bg-night/15 text-night" : "bg-nap/15 text-nap"
        }`}
        title={s.failed ? "Siesta fallida" : night ? "Noche" : "Siesta"}
      >
        {s.failed ? <XCircle className="size-5" aria-hidden /> : night ? <Moon className="size-5" aria-hidden /> : <Sun className="size-5" aria-hidden />}
        <span className="sr-only">{s.failed ? "Siesta fallida" : night ? "Noche" : "Siesta"}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-ink">
          <span>
            {clock(start)} <ArrowRight className="inline size-3.5 text-muted" aria-label="hasta" /> {end ? clock(end) : "…"}
          </span>
          {s.failed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200">
              Siesta fallida{end ? ` · intento de ${formatDuration((end - start) / 60_000)}` : ""}
            </span>
          ) : end ? (
            <span className="text-sm font-medium text-ink-2">· {formatDuration(sleptMin(s))}</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-indigo-100">
              <span className="size-1.5 animate-pulse rounded-full bg-indigo-300" aria-hidden /> Durmiendo
            </span>
          )}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{routine != null ? `Rutina ${formatDuration(routine)}` : "Sin rutina"}</span>
          <span className="inline-flex items-center gap-1" title="Humor antes → después">
            <MoodIcon value={s.moodBefore} className="size-4" />
            <span className="sr-only">Antes: {moodLabel(s.moodBefore)}.</span>
            <ArrowRight className="size-3" aria-hidden />
            <MoodIcon value={s.moodAfter} className="size-4" />
            <span className="sr-only">Después: {moodLabel(s.moodAfter)}.</span>
          </span>
          {s.location && (
            <span className="inline-flex max-w-full items-center gap-1 break-words">
              <MapPin className="size-3 shrink-0" aria-hidden /> {s.location}
            </span>
          )}
          {!s.failed &&
            (s.wakings.length > 0 ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${night ? "bg-night/15 text-indigo-100" : "bg-nap/15 text-amber-100"}`}
              >
                <Eye className="size-3" aria-hidden />
                {s.wakings.length} {s.wakings.length === 1 ? "despertar" : "despertares"} · {formatDuration(awake)}
                {helped > 0 && ` · ${helped} con ayuda`}
                {milk > 0 && ` · ${milk} ${milk === 1 ? "toma" : "tomas"} de leche`}
              </span>
            ) : (
              end && !night && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-200">De corrido</span>
            ))}
          {s.accompaniment.map((a) => (
            <span key={a} className="max-w-full break-words rounded-full border border-line px-2 py-0.5">
              {a}
            </span>
          ))}
        </p>
        {!s.failed && s.wakings.length > 0 && (
          <ol className="mt-2 space-y-1 border-l-2 border-line pl-3" aria-label="Despertares">
            {s.wakings.map((w, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
                <span className="inline-flex items-center gap-1 font-semibold text-ink">
                  <Clock className="size-3 text-muted" aria-hidden />
                  {clock(Date.parse(w.at))}
                </span>
                <span className="text-muted">· {formatDuration(w.durationMin)}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                    w.milk ? "bg-sky-400/15 text-sky-100" : "bg-white/5 text-muted"
                  }`}
                >
                  <Milk className="size-3" aria-hidden />
                  {w.milk ? "Toma de leche" : "Sin toma"}
                </span>
                {w.accompaniment.length > 0 ? (
                  w.accompaniment.map((a) => (
                    <span key={a} className="max-w-full break-words rounded-full border border-line px-2 py-0.5">
                      {a === "Solo/a" ? "Sola/o, sin ayuda" : a}
                    </span>
                  ))
                ) : (
                  <span className="text-muted">sin acompañamiento indicado</span>
                )}
              </li>
            ))}
          </ol>
        )}
        {s.notes && (
          <p className="mt-1.5 whitespace-pre-wrap text-xs italic text-muted [overflow-wrap:anywhere]">{s.notes}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
        {!end && (
          <Link
            href={`/registro?editar=${s.id}&despertar=1#formulario`}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary/20 px-3 text-xs font-semibold text-indigo-100 transition hover:bg-primary/30"
          >
            <AlarmClock className="size-4" aria-hidden /> Despertó
          </Link>
        )}
        <div className="flex items-center gap-1">
          <Link
            href={`/registro?editar=${s.id}#formulario`}
            className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-white/5 hover:text-ink"
            aria-label="Editar registro"
          >
            <Pencil className="size-4" aria-hidden />
          </Link>
          <DeleteButton id={s.id} />
        </div>
      </div>
    </li>
  );
}
