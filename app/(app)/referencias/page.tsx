import type { Metadata } from "next";
import { AlarmClock, Hourglass, Info, Lock, Sun, SunMedium } from "lucide-react";
import { WAKE_WINDOW_LABELS, getReferences } from "@/lib/references";
import { formatClock, formatDuration } from "@/lib/time";

export const metadata: Metadata = { title: "Referencias · LetSleep" };

export default function ReferenciasPage() {
  const refs = getReferences();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">Parámetros de referencia</h1>
        <p className="mt-2 text-sm text-muted">
          Valores objetivo contra los que se comparan las estadísticas del dashboard y con los que se calcula la
          próxima siesta recomendada.
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-indigo-100">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        En esta versión los parámetros son fijos. Más adelante cada usuario podrá ajustarlos a su caso.
      </p>

      <section aria-labelledby="ref-naps" className="card p-5 sm:p-6">
        <Heading id="ref-naps" icon={Sun} title="Tiempo total de siestas al día" />
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-ink">
            {formatDuration(refs.napTotalMin.min)} – {formatDuration(refs.napTotalMin.max)}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">Suma de todas las siestas de un día.</p>
      </section>

      <section aria-labelledby="ref-windows" className="card p-5 sm:p-6">
        <Heading id="ref-windows" icon={Hourglass} title="Ventanas de vigilia" />
        <p className="-mt-2 mb-4 text-sm text-muted">
          Tiempo despierto recomendado entre un sueño y el siguiente. Se considera «en objetivo» si está a ±
          {refs.wakeWindowToleranceMin} min.
        </p>
        <ol className="space-y-2">
          {refs.wakeWindowsMin.map((m, i) => (
            <li key={i} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white/[0.02] px-4 py-3">
              <span className="flex items-center gap-3 text-sm text-ink-2">
                <span className="grid size-7 place-items-center rounded-full bg-nap/15 text-xs font-bold text-amber-200">{i + 1}</span>
                {WAKE_WINDOW_LABELS[i]}
              </span>
              <span className="text-lg font-semibold text-ink">{formatDuration(m)}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section aria-labelledby="ref-late" className="card p-5 sm:p-6">
          <Heading id="ref-late" icon={SunMedium} title="Última siesta" />
          <p className="text-3xl font-semibold text-ink">{formatClock(refs.latestNapStart)}</p>
          <p className="mt-1 text-sm text-muted">Ninguna siesta debería empezar después de esta hora.</p>
        </section>
        <section aria-labelledby="ref-wake" className="card p-5 sm:p-6">
          <Heading id="ref-wake" icon={AlarmClock} title="Despertar de la mañana" />
          <p className="text-3xl font-semibold text-ink">{formatClock(refs.earliestMorningWake)}</p>
          <p className="mt-1 text-sm text-muted">No debería levantarse antes de esta hora.</p>
        </section>
      </div>

      <p className="flex items-start gap-2 px-1 text-xs text-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Son referencias orientativas para detectar tendencias; no sustituyen el consejo de un profesional de la salud.
      </p>
    </div>
  );
}

function Heading({ id, icon: Icon, title }: { id: string; icon: typeof Sun; title: string }) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-3 font-serif text-lg font-semibold text-ink sm:text-xl">
      <span className="grid size-9 place-items-center rounded-xl bg-white/[0.06]">
        <Icon className="size-[18px] text-indigo-200" aria-hidden />
      </span>
      {title}
    </h2>
  );
}
