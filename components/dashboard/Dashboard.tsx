"use client";

import Link from "next/link";
import {
  AlarmClock,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Hand,
  Hourglass,
  Eye,
  Lightbulb,
  MapPin,
  Scale,
  Moon,
  RotateCcw,
  XCircle,
  CheckCircle2,
  Sun,
  Sunrise,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { Bucket, Dashboard as Data, Insight } from "@/lib/stats";
import { fmtNum } from "@/lib/stats";
import { formatClock, formatDuration, longDayLabel } from "@/lib/time";
import { moodLabel } from "@/lib/types";
import { MoodIcon } from "@/components/MoodIcon";
import { BucketChart, C, DailyChart, EmptyChart, SleepTimeline, WeeklyMultiples } from "./charts";
import { ReferencesSection } from "./references";
import { NextNapCard } from "@/components/NextNapCard";

const RANGES = [1, 2, 3, 4] as const;

export function Dashboard({ data }: { data: Data }) {
  const { today, baseline, weeks } = data;
  const rangeText = weeks === 1 ? "la última semana" : `las últimas ${weeks} semanas`;
  const noData = data.sessionCount === 0;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium capitalize text-indigo-300">Hoy, {longDayLabel(data.todayKey)}</p>
          <h1 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">Estadísticas de sueño</h1>
        </div>
        <nav aria-label="Periodo de comparación" className="flex rounded-2xl border border-line bg-white/[0.03] p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/estadisticas?semanas=${r}`}
              aria-current={r === weeks ? "true" : undefined}
              scroll={false}
              className={`inline-flex h-9 items-center rounded-xl px-3 text-sm font-semibold transition sm:px-4 ${
                r === weeks ? "bg-primary/25 text-white" : "text-muted hover:bg-white/5 hover:text-ink"
              }`}
            >
              {r} sem
            </Link>
          ))}
        </nav>
      </div>

      {data.inProgress && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-indigo-100">
          <span className="size-2 animate-pulse rounded-full bg-indigo-300" aria-hidden />
          Durmiendo ahora ({data.inProgress.kind === "night" ? "noche" : "siesta"}) · {formatDuration(data.inProgress.sinceMin)}
          <Link href="/registro" className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline">
            Registrar despertar <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}

      <NextNapCard next={data.nextNap} latestNapStart={data.references.refs.latestNapStart} />

      {noData ? (
        <div className="card grid place-items-center gap-3 p-12 text-center">
          <Moon className="size-12 text-night" aria-hidden />
          <p className="font-serif text-xl font-semibold text-ink">Todavía no hay datos en este periodo</p>
          <p className="max-w-md text-sm text-muted">
            Registra algunas siestas y noches y aquí verás las tendencias, comparativas y los mejores horarios.
          </p>
          <Link
            href="/registro"
            className="mt-2 inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-5 font-semibold text-white"
          >
            Ir al registro <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <>
          {/* KPIs de hoy */}
          <section aria-label="Resumen de hoy" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <Kpi
              icon={BedDouble}
              tint="from-indigo-400/25"
              label="Sueño total hoy"
              value={formatDuration(today.totalMin)}
              sub={today.nightCount > 0 ? "Siestas de hoy + noche de hoy" : "Siestas de hoy · falta la noche"}
              delta={delta(today.totalMin, baseline.totalMin, today.nightCount > 0)}
              fmt={formatDuration}
              rangeText={rangeText}
            />
            <Kpi
              icon={Moon}
              tint="from-violet-400/25"
              label="Última noche"
              value={data.lastNight ? formatDuration(data.lastNight.durationMin) : "—"}
              sub={
                data.lastNight
                  ? `${formatClock(data.lastNight.start)} → ${formatClock(data.lastNight.end)}${
                      data.lastNight.wakings
                        ? ` · ${data.lastNight.wakings} ${data.lastNight.wakings === 1 ? "despertar" : "despertares"} (${formatDuration(data.lastNight.wakingMin)})`
                        : " · sin despertares"
                    }${data.lastNight.awakeFrom != null ? ` · despierta desde ${formatClock(data.lastNight.awakeFrom)}` : ""}${
                      data.lastNight.dramaticWake != null ? ` · despertar dramático ${formatClock(data.lastNight.dramaticWake)}` : ""
                    }`
                  : "Sin registro reciente"
              }
              delta={data.lastNight ? delta(data.lastNight.durationMin, baseline.nightMin, true) : null}
              fmt={formatDuration}
              rangeText={rangeText}
            />
            <Kpi
              icon={Sun}
              tint="from-amber-400/25"
              label="Siestas hoy"
              value={String(today.napCount)}
              sub={`${today.napCount ? `${formatDuration(today.napMin)} en total` : "Ninguna todavía"} · ref. ${fmtNum(
                data.references.refs.napTotalMin.min / 60,
              )}–${fmtNum(data.references.refs.napTotalMin.max / 60)} h`}
              delta={delta(today.napCount, baseline.napCount, true)}
              fmt={(v) => fmtNum(v)}
              rangeText={rangeText}
            />
            <Kpi
              icon={Sunrise}
              tint="from-emerald-400/25"
              label="Humor al despertar"
              value={today.moodAfterAvg != null ? `${fmtNum(today.moodAfterAvg)}/5` : "—"}
              sub={today.moodAfterAvg != null ? moodLabel(Math.round(today.moodAfterAvg)) : "Sin datos hoy"}
              trailing={<MoodIcon value={today.moodAfterAvg} className="size-7" />}
              delta={delta(today.moodAfterAvg, baseline.moodAfter, today.moodAfterAvg != null)}
              fmt={(v) => fmtNum(v)}
              rangeText={rangeText}
            />
          </section>

          {/* Medias del periodo */}
          <section aria-label="Medias del periodo" className="card grid grid-cols-2 gap-px overflow-hidden bg-line p-0 sm:grid-cols-5">
            <Avg icon={Moon} label="Se duerme (noche)" value={baseline.bedtime != null ? formatClock(baseline.bedtime) : "—"} />
            <Avg icon={AlarmClock} label="Se despierta" value={baseline.wakeTime != null ? formatClock(baseline.wakeTime) : "—"} />
            <Avg icon={BedDouble} label="Sueño / día" value={formatDuration(baseline.totalMin)} />
            <Avg icon={Sun} label="Siestas / día" value={baseline.napCount != null ? fmtNum(baseline.napCount) : "—"} />
            <Avg icon={Timer} label="Rutina media" value={formatDuration(baseline.routineMin)} />
            <Avg
              icon={Eye}
              label="Despertares / noche"
              value={baseline.wakingsPerNight != null ? fmtNum(baseline.wakingsPerNight) : "—"}
            />
            <Avg icon={Eye} label="Despierto / noche" value={formatDuration(baseline.wakingMinPerNight)} />
            <Avg
              icon={Sunrise}
              label="Humor antes → después"
              value={
                baseline.moodBefore != null && baseline.moodAfter != null
                  ? `${fmtNum(baseline.moodBefore)} → ${fmtNum(baseline.moodAfter)}`
                  : "—"
              }
            />
            <Avg
              icon={Sunrise}
              label="Despertar dramático"
              value={baseline.dramaticWake != null ? formatClock(baseline.dramaticWake) : "—"}
            />
            <Avg icon={AlarmClock} label="No volvió a dormirse" value={`${baseline.endedAwakeNights} ${baseline.endedAwakeNights === 1 ? "noche" : "noches"}`} />
          </section>
          <p className="-mt-3 px-1 text-xs text-muted">
            Medias de {rangeText} (sin contar hoy) · {baseline.days} {baseline.days === 1 ? "día" : "días"} con datos
          </p>

          {/* Insights */}
          {data.insights.length > 0 && (
            <section aria-labelledby="insights-title" className="card p-5 sm:p-6">
              <SectionTitle id="insights-title" icon={Lightbulb} title="Mejores horarios y hallazgos" sub={`Basado en ${rangeText}`} />
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.insights.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </ul>
            </section>
          )}

          {/* Referencias */}
          <section aria-labelledby="refs-title" className="card p-5 sm:p-6">
            <SectionTitle
              id="refs-title"
              icon={Scale}
              title="Comparación con las referencias"
              sub={`Ventanas de vigilia, tiempo de siesta y horarios límite · ${rangeText}`}
            />
            <ReferencesSection rep={data.references} days={data.days} />
          </section>

          {/* Calidad de las siestas */}
          <section aria-labelledby="napq-title" className="card p-5 sm:p-6">
            <SectionTitle
              id="napq-title"
              icon={Sun}
              title="¿Cómo fueron las siestas?"
              sub={`De corrido, con despertares o fallidas · ${rangeText}`}
            />
            <NapQualityBar q={data.napQuality} />
          </section>

          {/* Horas por día */}
          <section aria-labelledby="daily-title" className="card p-5 sm:p-6">
            <SectionTitle id="daily-title" icon={BedDouble} title="Horas de sueño por día" sub="Siestas del día + la noche que empieza ese día" />
            <DailyChart days={data.days} avgTotal={baseline.totalMin} />
          </section>

          {/* Patrón */}
          <section aria-labelledby="pattern-title" className="card p-5 sm:p-6">
            <SectionTitle id="pattern-title" icon={Moon} title="Patrón de sueño" sub="Cada fila es un día de 00:00 a 24:00 · lo más reciente arriba · los huecos son despertares · contorno discontinuo = siesta fallida" />
            <SleepTimeline days={data.timeline} />
          </section>

          {/* Comparativa semanal */}
          <section aria-labelledby="weekly-title" className="card p-5 sm:p-6">
            <SectionTitle
              id="weekly-title"
              icon={TrendingUp}
              title="Comparativa semanal"
              sub={weeks === 1 ? "Elige 2, 3 o 4 semanas para comparar con semanas anteriores" : "Media diaria de cada semana · la actual resaltada"}
            />
            <WeeklyMultiples weeks={data.weekSummaries} />
          </section>

          {/* Horarios */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="bed-title" className="card p-5 sm:p-6">
              <SectionTitle id="bed-title" icon={Moon} title="Humor según hora de dormir (noche)" sub="Humor medio al despertar · resaltada la mejor franja" />
              <BucketChart buckets={data.bedtime} color={C.night} emptyText="Registra noches con humor al despertar para ver esta gráfica." />
            </section>
            <section aria-labelledby="nap-title" className="card p-5 sm:p-6">
              <SectionTitle id="nap-title" icon={Sun} title="Humor según hora de la siesta" sub="Humor medio al despertar · resaltada la mejor franja" />
              <BucketChart buckets={data.napStart} color={C.nap} emptyText="Registra siestas con humor al despertar para ver esta gráfica." />
            </section>
            <section aria-labelledby="ww-title" className="card p-5 sm:p-6">
              <SectionTitle id="ww-title" icon={Hourglass} title="Tiempo despierto antes de la siesta" sub="Desde el último despertar · humor medio tras la siesta" />
              <BucketChart buckets={data.wakeWindow} color={C.nap} emptyText="Hace falta registrar varios sueños seguidos para calcular la ventana de vigilia." />
            </section>
            <section aria-labelledby="rt-title" className="card p-5 sm:p-6">
              <SectionTitle id="rt-title" icon={Timer} title="Duración de la rutina" sub="Del inicio de la rutina a quedarse dormido · humor al despertar" />
              <BucketChart buckets={data.routine} color={C.routine} emptyText="Registra la hora de inicio de la rutina para ver esta gráfica." />
            </section>
          </div>

          {/* Acompañamiento */}
          <section aria-labelledby="acc-title" className="card p-5 sm:p-6">
            <SectionTitle id="acc-title" icon={Hand} title="Acompañamiento" sub="Cuánto tarda en dormirse y cómo despierta según la ayuda recibida" />
            {data.accompaniment.length ? (
              <TagTable buckets={data.accompaniment} title="Acompañamiento" />
            ) : (
              <EmptyChart text="Sin datos de acompañamiento en este periodo." />
            )}
          </section>

          {/* Dónde durmió */}
          <section aria-labelledby="loc-title" className="card p-5 sm:p-6">
            <SectionTitle id="loc-title" icon={MapPin} title="Dónde durmió" sub="Duración y humor al despertar según el lugar" />
            {data.location.length ? (
              <TagTable buckets={data.location} title="Lugar" />
            ) : (
              <EmptyChart text="Indica dónde durmió en los registros para ver esta tabla." />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function delta(cur: number | null, base: number | null, has: boolean) {
  if (!has || cur == null || base == null) return null;
  return { diff: cur - base, base };
}

function Kpi({
  icon: Icon,
  tint,
  label,
  value,
  sub,
  delta,
  fmt,
  rangeText,
  trailing,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
  value: string;
  sub: string;
  delta: { diff: number; base: number } | null;
  fmt: (v: number) => string;
  rangeText: string;
  trailing?: React.ReactNode;
}) {
  const up = delta && delta.diff > 0.01;
  const down = delta && delta.diff < -0.01;
  return (
    <div className={`card relative overflow-hidden bg-gradient-to-br ${tint} to-transparent p-4 sm:p-5`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl bg-white/10">
          <Icon className="size-5 text-ink" aria-hidden />
        </span>
        {trailing}
      </div>
      <p className="text-xs font-medium text-ink-2 sm:text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
      {delta && (
        <p className="mt-3 inline-flex flex-wrap items-center gap-1 rounded-full bg-black/20 px-2 py-1 text-[11px] font-medium text-ink-2" title={`Media de ${rangeText}: ${fmt(delta.base)}`}>
          {up ? <ArrowUpRight className="size-3.5 text-indigo-200" aria-hidden /> : down ? <ArrowDownRight className="size-3.5 text-indigo-200" aria-hidden /> : null}
          {up || down ? `${up ? "+" : "−"}${fmt(Math.abs(delta.diff))}` : "Igual"} vs media
        </p>
      )}
    </div>
  );
}

function Avg({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="size-3.5" aria-hidden /> {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function SectionTitle({ id, icon: Icon, title, sub }: { id: string; icon: LucideIcon; title: string; sub?: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.06]">
        <Icon className="size-[18px] text-indigo-200" aria-hidden />
      </span>
      <div>
        <h2 id={id} className="font-serif text-lg font-semibold text-ink sm:text-xl">
          {title}
        </h2>
        {sub && <p className="text-xs text-muted sm:text-sm">{sub}</p>}
      </div>
    </div>
  );
}

const INSIGHT_ICONS: Record<Insight["icon"], LucideIcon> = {
  sun: Sun,
  moon: Moon,
  timer: Timer,
  hourglass: Hourglass,
  hand: Hand,
  "trend-up": TrendingUp,
  "trend-down": TrendingDown,
  target: Target,
};

const TONE: Record<Insight["tone"], { ring: string; chip: string; text: string }> = {
  good: { ring: "border-emerald-400/25", chip: "bg-emerald-400/15 text-emerald-200", text: "Favorable" },
  info: { ring: "border-indigo-400/25", chip: "bg-indigo-400/15 text-indigo-200", text: "Patrón" },
  warn: { ring: "border-amber-400/25", chip: "bg-amber-400/15 text-amber-200", text: "A vigilar" },
};

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = INSIGHT_ICONS[insight.icon];
  const t = TONE[insight.tone];
  return (
    <li className={`rounded-2xl border ${t.ring} bg-white/[0.025] p-4`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`grid size-9 place-items-center rounded-xl ${t.chip}`}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.chip}`}>{t.text}</span>
      </div>
      <p className="font-semibold text-ink">{insight.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{insight.body}</p>
    </li>
  );
}

function TagTable({ buckets, title }: { buckets: Bucket[]; title: string }) {
  const maxRoutine = Math.max(1, ...buckets.map((a) => a.avgRoutineMin ?? 0));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th className="pb-2 font-semibold">{title}</th>
            <th className="pb-2 font-semibold">Veces</th>
            <th className="w-2/5 pb-2 font-semibold">Tiempo hasta dormirse</th>
            <th className="pb-2 font-semibold">Duración media</th>
            <th className="pb-2 font-semibold">Humor al despertar</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((a) => (
            <tr key={a.key} className="border-t border-line">
              <td className="py-2.5 pr-3 font-medium text-ink">
                {a.label}
                {a.best && <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">mejor humor</span>}
              </td>
              <td className="py-2.5 pr-3 text-ink-2">{a.count}</td>
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 flex-1 rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${((a.avgRoutineMin ?? 0) / maxRoutine) * 100}%`, background: C.routine }}
                    />
                  </div>
                  <span className="w-16 text-right text-ink-2">{formatDuration(a.avgRoutineMin)}</span>
                </div>
              </td>
              <td className="py-2.5 pr-3 text-ink-2">{formatDuration(a.avgDurationMin)}</td>
              <td className="py-2.5">
                <span className="inline-flex items-center gap-1.5 text-ink-2">
                  <MoodIcon value={a.avgMoodAfter} className="size-4" />
                  {a.avgMoodAfter != null ? `${fmtNum(a.avgMoodAfter)}/5` : "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NapQualityBar({ q }: { q: Data["napQuality"] }) {
  const total = q.naps + q.failed;
  if (!total) return <EmptyChart text="Sin siestas en este periodo." />;
  const parts = [
    { key: "u", label: "De corrido", value: q.uninterrupted, color: C.nap, Icon: CheckCircle2 },
    { key: "s", label: "Se despertó y se volvió a dormir sola", value: q.selfSettled, color: "#e0b45c", Icon: RotateCcw },
    { key: "h", label: "Necesitó ayuda para volver a dormirse", value: q.neededHelp, color: C.night, Icon: Hand },
    { key: "f", label: "Siesta fallida (no se durmió)", value: q.failed, color: "#64748b", Icon: XCircle },
  ];
  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(", ")}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <span key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />
          ))}
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {parts.map((p) => (
          <li key={p.key} className="rounded-2xl border border-line bg-white/[0.02] p-3">
            <p className="flex items-center gap-2 text-xs text-ink-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden />
              <p.Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
              {p.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink">
              {p.value} <span className="text-sm font-normal text-muted">({Math.round((p.value / total) * 100)} %)</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
