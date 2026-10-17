"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlarmClock, ArrowDown, ArrowRight, ArrowUp, CheckCircle2, Hourglass, Sun, SunMedium, TriangleAlert } from "lucide-react";
import type { DaySummary, ReferenceReport, RefStatus, WakeWindowStat } from "@/lib/stats";
import { fmtNum, refStatus } from "@/lib/stats";
import { formatClock, formatDuration, longDayLabel } from "@/lib/time";
import { C, TooltipBox } from "./charts";

const STATUS: Record<RefStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: "En objetivo", cls: "bg-emerald-400/15 text-emerald-200", Icon: CheckCircle2 },
  short: { label: "Más corta", cls: "bg-amber-400/15 text-amber-200", Icon: ArrowDown },
  long: { label: "Más larga", cls: "bg-amber-400/15 text-amber-200", Icon: ArrowUp },
};

export function ReferencesSection({ rep, days }: { rep: ReferenceReport; days: DaySummary[] }) {
  const { refs } = rep;
  const napRange = `${fmtNum(refs.napTotalMin.min / 60)}–${fmtNum(refs.napTotalMin.max / 60)} h`;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white/[0.02] p-4 sm:p-5">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
            <Hourglass className="size-4 text-amber-200" aria-hidden /> Ventanas de vigilia
          </h3>
          <p className="mb-4 text-xs text-muted">
            Media del periodo frente al objetivo · franja = objetivo ± {refs.wakeWindowToleranceMin} min
          </p>
          <ul className="space-y-4">
            {rep.wakeWindows.map((w) => (
              <WindowRow key={w.index} w={w} tolerance={refs.wakeWindowToleranceMin} />
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-white/[0.02] p-4 sm:p-5">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
            <Sun className="size-4 text-amber-200" aria-hidden /> Tiempo de siesta por día
          </h3>
          <p className="mb-3 text-xs text-muted">
            Franja sombreada = referencia de {napRange}
            {rep.napTotal.days > 0 && ` · ${rep.napTotal.within} de ${rep.napTotal.days} días dentro`}
          </p>
          <NapTotalChart days={days} min={refs.napTotalMin.min} max={refs.napTotalMin.max} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <RuleTile
          icon={Sun}
          title="Siesta total media"
          value={formatDuration(rep.napTotal.avgMin)}
          ok={rep.napTotal.avgMin == null || (rep.napTotal.avgMin >= refs.napTotalMin.min && rep.napTotal.avgMin <= refs.napTotalMin.max)}
          detail={
            rep.napTotal.days
              ? `${rep.napTotal.below} días por debajo · ${rep.napTotal.above} por encima de ${napRange}`
              : "Sin días completos todavía"
          }
        />
        <RuleTile
          icon={SunMedium}
          title={`Siestas después de las ${formatClock(refs.latestNapStart)}`}
          value={String(rep.lateNaps.count)}
          ok={rep.lateNaps.count === 0}
          detail={
            rep.lateNaps.count
              ? `De ${rep.lateNaps.totalNaps} siestas · la más tardía a las ${formatClock(rep.lateNaps.latest!)}`
              : `Ninguna de ${rep.lateNaps.totalNaps} siestas`
          }
        />
        <RuleTile
          icon={AlarmClock}
          title={`Despertares antes de las ${formatClock(refs.earliestMorningWake)}`}
          value={String(rep.earlyWakes.count)}
          ok={rep.earlyWakes.count === 0}
          detail={
            rep.earlyWakes.count
              ? `De ${rep.earlyWakes.mornings} mañanas · el más temprano a las ${formatClock(rep.earlyWakes.earliest!)}`
              : `Ninguno de ${rep.earlyWakes.mornings} mañanas`
          }
        />
      </div>
      <p className="px-1 text-xs text-muted">
        Los objetivos se pueden consultar en{" "}
        <Link href="/referencias" className="inline-flex items-center gap-0.5 font-semibold text-indigo-300 hover:underline">
          Referencias <ArrowRight className="size-3" aria-hidden />
        </Link>
      </p>
    </div>
  );
}

function WindowRow({ w, tolerance }: { w: WakeWindowStat; tolerance: number }) {
  const scaleMax = Math.max(w.targetMin * 1.7, (w.avgMin ?? 0) * 1.1);
  const pct = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`;
  const status = w.avgMin != null ? refStatus(w.avgMin, w.targetMin, tolerance) : null;
  const S = status ? STATUS[status] : null;
  const diff = w.avgMin != null ? w.avgMin - w.targetMin : null;
  return (
    <li>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm text-ink-2">
          {w.label} <span className="text-xs text-muted">· objetivo {formatDuration(w.targetMin)}</span>
        </span>
        {S && diff != null ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-ink">{formatDuration(w.avgMin)}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${S.cls}`}>
              <S.Icon className="size-3" aria-hidden />
              {status === "ok" ? S.label : `${diff > 0 ? "+" : "−"}${formatDuration(Math.abs(diff))}`}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted">Sin datos</span>
        )}
      </div>
      <div
        className="relative h-3 rounded-full bg-white/[0.05]"
        role="img"
        aria-label={
          w.avgMin != null
            ? `${w.label}: media ${formatDuration(w.avgMin)}, objetivo ${formatDuration(w.targetMin)}`
            : `${w.label}: sin datos`
        }
      >
        <span
          className="absolute inset-y-0 rounded-full bg-emerald-400/15"
          style={{ left: pct(w.targetMin - tolerance), width: `calc(${pct(w.targetMin + tolerance)} - ${pct(w.targetMin - tolerance)})` }}
          aria-hidden
        />
        {w.avgMin != null && (
          <span className="absolute inset-y-[4px] left-0 rounded-full" style={{ width: pct(w.avgMin), background: C.nap }} aria-hidden />
        )}
        <span className="absolute -inset-y-1 w-[2px] rounded bg-ink" style={{ left: pct(w.targetMin) }} aria-hidden />
      </div>
      {w.count > 0 && (
        <p className="mt-1 text-[11px] text-muted">
          {w.ok} de {w.count} en objetivo · {w.short} más cortas · {w.long} más largas
        </p>
      )}
    </li>
  );
}

function NapTotalChart({ days, min, max }: { days: DaySummary[]; min: number; max: number }) {
  const data = days.map((d) => ({ ...d, napH: +(d.napMin / 60).toFixed(2) }));
  const dense = days.length > 14;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap={dense ? "18%" : "28%"}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <ReferenceArea y1={min / 60} y2={max / 60} fill={C.routine} fillOpacity={0.14} ifOverflow="extendDomain" />
          <XAxis
            dataKey="label"
            tick={{ fill: C.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={10}
            tickFormatter={(v: string) => (dense ? v.split(" ")[1] : v)}
          />
          <YAxis tick={{ fill: C.axis, fontSize: 12 }} tickLine={false} axisLine={false} unit=" h" allowDecimals={false} width={52} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DaySummary;
              const st = !d.hasData ? "Sin registros" : d.napMin < min ? "Por debajo" : d.napMin > max ? "Por encima" : "Dentro del rango";
              return (
                <TooltipBox
                  title={longDayLabel(d.dateKey)}
                  rows={[
                    { label: `Siestas (${d.napCount})`, value: formatDuration(d.napMin), color: C.nap },
                    { label: "Referencia", value: st },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="napH" fill={C.nap} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RuleTile({
  icon: Icon,
  title,
  value,
  ok,
  detail,
}: {
  icon: typeof Sun;
  title: string;
  value: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-ink-2">
          <Icon className="size-4 text-muted" aria-hidden /> {title}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            ok ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"
          }`}
        >
          {ok ? <CheckCircle2 className="size-3" aria-hidden /> : <TriangleAlert className="size-3" aria-hidden />}
          {ok ? "Cumple" : "Revisar"}
        </span>
      </div>
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{detail}</p>
    </div>
  );
}
