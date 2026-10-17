import { AlarmClock, BedDouble, CheckCircle2, SunMedium } from "lucide-react";
import type { NextNap } from "@/lib/stats";
import { formatClock, formatDuration } from "@/lib/time";

/** Siguiente siesta recomendada según las ventanas de vigilia de referencia. */
export function NextNapCard({ next, latestNapStart }: { next: NextNap | null; latestNapStart: number }) {
  if (!next) return null;
  if (next.status === "done") {
    return (
      <Shell icon={CheckCircle2} tone="border-emerald-400/30 bg-emerald-400/10 text-emerald-100">
        <strong className="font-semibold">Siestas del día completas.</strong> Ya se han hecho {next.index} siestas; lo
        siguiente es la rutina de la noche.
      </Shell>
    );
  }
  if (next.status === "too-late") {
    return (
      <Shell icon={BedDouble} tone="border-night/40 bg-night/10 text-indigo-100">
        <strong className="font-semibold">Hoy ya no toca otra siesta.</strong> Con {formatDuration(next.targetMin)} de vigilia
        tras {next.fromLabel} caería a las {formatClock(next.atMin)}, después del límite de las{" "}
        {formatClock(latestNapStart)}. Mejor adelantar la noche.
      </Shell>
    );
  }
  return (
    <Shell
      icon={next.overdue ? AlarmClock : SunMedium}
      tone={next.overdue ? "border-amber-400/40 bg-amber-400/10 text-amber-100" : "border-nap/40 bg-nap/10 text-amber-100"}
    >
      <span className="block text-xs uppercase tracking-wider opacity-80">
        {next.overdue ? "Siesta pendiente" : "Próxima siesta recomendada"}
      </span>
      <span className="text-2xl font-semibold text-ink">{formatClock(next.atMin)}</span>{" "}
      <span className="opacity-90">
        · {next.index + 1}ª siesta, {formatDuration(next.targetMin)} después de {next.fromLabel}
      </span>
    </Shell>
  );
}

function Shell({ icon: Icon, tone, children }: { icon: typeof SunMedium; tone: string; children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${tone}`} role="status">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="leading-snug">{children}</p>
    </div>
  );
}
