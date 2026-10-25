"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Moon, Sun, Table2 } from "lucide-react";
import type { Bucket, DaySummary, TimelineDay, WeekSummary } from "@/lib/stats";
import { fmtNum } from "@/lib/stats";
import { formatClock, formatDuration, longDayLabel } from "@/lib/time";

export const C = {
  surface: "#151c2e",
  grid: "rgba(255,255,255,0.06)",
  axis: "#94a3b8",
  night: "#9085e9",
  nap: "#c98500",
  routine: "#199e70",
  muted: "#3a4363",
  highlight: "#a5b4fc",
};

const axisProps = {
  tick: { fill: C.axis, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;

export function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="min-w-44 rounded-xl border border-line-strong bg-[#0f1527]/95 px-3 py-2.5 text-xs shadow-2xl shadow-black/50 backdrop-blur">
      <p className="mb-1.5 font-semibold capitalize text-ink">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4 text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              {r.color && <span className="size-2.5 rounded-sm" style={{ background: r.color }} aria-hidden />}
              {r.label}
            </span>
            <span className="font-semibold text-ink">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; icon?: "moon" | "sun"; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? (
            <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} aria-hidden />
          ) : (
            <span className="size-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
          )}
          {i.icon === "moon" && <Moon className="size-3.5 text-muted" aria-hidden />}
          {i.icon === "sun" && <Sun className="size-3.5 text-muted" aria-hidden />}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/* Barra con extremo superior redondeado solo en el segmento más alto del apilado */
type ShapeProps = { x?: number; y?: number; width?: number; height?: number; fill?: string; payload?: Record<string, number> };
function stackShape(topKey: string, isTop: boolean) {
  function StackSegment(props: ShapeProps) {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload } = props;
    if (height <= 0) return null;
    const roundTop = isTop || !((payload?.[topKey] ?? 0) > 0);
    const r = Math.min(4, width / 2, height);
    const gap = isTop ? 0 : 2; // 2 px de separación entre segmentos
    const h = Math.max(0, height - (roundTop ? 0 : gap));
    const yy = roundTop ? y : y + gap;
    const path = roundTop
      ? `M${x},${yy + h} L${x},${yy + r} Q${x},${yy} ${x + r},${yy} L${x + width - r},${yy} Q${x + width},${yy} ${x + width},${yy + r} L${x + width},${yy + h} Z`
      : `M${x},${yy} h${width} v${h} h${-width} Z`;
    return <path d={path} fill={fill} />;
  }
  return StackSegment;
}

export function DailyChart({ days, avgTotal }: { days: DaySummary[]; avgTotal: number | null }) {
  const [table, setTable] = useState(false);
  const data = days.map((d) => ({
    ...d,
    night: +(d.nightMin / 60).toFixed(2),
    nap: +(d.napMin / 60).toFixed(2),
  }));
  const dense = days.length > 14;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Legend
          items={[
            { label: "Noche", color: C.night, icon: "moon" },
            { label: "Siestas", color: C.nap, icon: "sun" },
            ...(avgTotal ? [{ label: `Media ${formatDuration(avgTotal)}`, color: C.highlight, dashed: true }] : []),
          ]}
        />
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          aria-pressed={table}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted transition hover:bg-white/5 hover:text-ink"
        >
          <Table2 className="size-3.5" aria-hidden /> {table ? "Ver gráfico" : "Ver tabla"}
        </button>
      </div>
      {table ? (
        <div className="max-h-80 overflow-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-card-2 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Día</th>
                <th className="px-3 py-2 font-semibold">Noche</th>
                <th className="px-3 py-2 font-semibold">Siestas</th>
                <th className="px-3 py-2 font-semibold">Total</th>
                <th className="px-3 py-2 font-semibold">Humor</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.dateKey} className="border-t border-line text-ink-2">
                  <td className="px-3 py-2 capitalize">{longDayLabel(d.dateKey)}</td>
                  <td className="px-3 py-2">{d.hasData ? formatDuration(d.nightMin) : "—"}</td>
                  <td className="px-3 py-2">{d.hasData ? `${d.napCount} · ${formatDuration(d.napMin)}` : "—"}</td>
                  <td className="px-3 py-2 font-semibold text-ink">{d.hasData ? formatDuration(d.totalMin) : "—"}</td>
                  <td className="px-3 py-2">{d.moodAfterAvg != null ? `${fmtNum(d.moodAfterAvg)}/5` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap={dense ? "18%" : "28%"}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={10} tickFormatter={(v: string) => (dense ? v.split(" ")[1] : v)} />
              <YAxis {...axisProps} unit=" h" allowDecimals={false} width={56} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as DaySummary;
                  return (
                    <TooltipBox
                      title={longDayLabel(d.dateKey)}
                      rows={
                        d.hasData
                          ? [
                              { label: "Noche", value: formatDuration(d.nightMin), color: C.night },
                              ...(d.wakings
                                ? [{ label: `Despertares (${d.wakings})`, value: `−${formatDuration(d.wakingMin)}` }]
                                : []),
                              { label: `Siestas (${d.napCount})`, value: formatDuration(d.napMin), color: C.nap },
                              { label: "Total", value: formatDuration(d.totalMin) },
                              ...(d.moodAfterAvg != null ? [{ label: "Humor al despertar", value: `${fmtNum(d.moodAfterAvg)}/5` }] : []),
                            ]
                          : [{ label: "Sin registros", value: "" }]
                      }
                    />
                  );
                }}
              />
              {avgTotal != null && (
                <ReferenceLine y={avgTotal / 60} stroke={C.highlight} strokeDasharray="5 5" strokeOpacity={0.7} ifOverflow="extendDomain" />
              )}
              <Bar dataKey="night" stackId="s" fill={C.night} shape={stackShape("nap", false)} isAnimationActive={false} />
              <Bar dataKey="nap" stackId="s" fill={C.nap} shape={stackShape("nap", true)} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Patrón de sueño: cada fila es un día de 00:00 a 24:00 */
export function SleepTimeline({ days }: { days: TimelineDay[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const rows = [...days].reverse();
  const rowH = days.length > 14 ? "h-3.5" : "h-6";
  const ticks = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  return (
    <div>
      <div className="mb-3 flex min-h-5 flex-wrap items-center justify-between gap-3">
        <Legend
          items={[
            { label: "Noche", color: C.night, icon: "moon" },
            { label: "Siesta", color: C.nap, icon: "sun" },
          ]}
        />
        <p className="text-xs text-ink-2" aria-live="polite">
          {hover ?? "Pasa el cursor o toca un bloque para ver el detalle"}
        </p>
      </div>
      <div className="grid grid-cols-[3.25rem_1fr] gap-x-2">
        <div />
        <div className="relative mb-1.5 h-4 text-[11px] text-muted">
          {ticks.map((t) => (
            <span
              key={t}
              className={`absolute -translate-x-1/2 ${t % 6 ? "hidden sm:inline" : ""}`}
              style={{ left: `${(t / 24) * 100}%`, transform: t === 0 ? "none" : t === 24 ? "translateX(-100%)" : undefined }}
            >
              {String(t).padStart(2, "0")}h
            </span>
          ))}
        </div>
        {rows.map((d) => (
          <div key={d.dateKey} className="contents">
            <div className={`flex items-center text-[11px] text-muted ${days.length > 14 ? "my-[1px]" : "my-[3px]"}`}>{d.label}</div>
            <div className={`relative my-[1px] ${rowH} rounded-md bg-white/[0.035] ${days.length > 14 ? "" : "my-[3px]"}`}>
              {[6, 12, 18].map((t) => (
                <span key={t} className="absolute inset-y-0 w-px bg-white/[0.06]" style={{ left: `${(t / 24) * 100}%` }} aria-hidden />
              ))}
              {d.segments.map((s, i) => {
                const label = s.failed
                  ? `${longDayLabel(d.dateKey)} · Siesta fallida ${formatClock(s.startMin)}–${formatClock(s.endMin)} · intento de ${formatDuration(s.durationMin)}`
                  : `${longDayLabel(d.dateKey)} · ${s.kind === "night" ? "Noche" : "Siesta"} ${formatClock(s.startMin)}–${
                  s.inProgress ? "ahora" : formatClock(s.endMin)
                } · ${formatDuration(s.durationMin)} de sueño${
                  s.wakings.length ? ` · ${s.wakings.length} ${s.wakings.length === 1 ? "despertar" : "despertares"} en este tramo` : ""
                }${s.moodAfter ? ` · humor ${s.moodAfter}/5` : ""}`;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={label}
                    onMouseEnter={() => setHover(label)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(label)}
                    onBlur={() => setHover(null)}
                    className="absolute inset-y-0 cursor-default rounded-[4px] transition hover:brightness-125 focus-visible:z-10"
                    style={{
                      left: `${(s.startMin / 1440) * 100}%`,
                      width: `max(3px, ${((s.endMin - s.startMin) / 1440) * 100}%)`,
                      background: s.failed
                        ? "transparent"
                        : s.inProgress
                          ? `repeating-linear-gradient(135deg, ${s.kind === "night" ? C.night : C.nap} 0 4px, transparent 4px 7px)`
                          : s.kind === "night"
                            ? C.night
                            : C.nap,
                      border: s.failed ? `1.5px dashed ${C.nap}` : undefined,
                    }}
                  >
                    {s.wakings.map((w, j) => (
                      <span
                        key={j}
                        className="absolute inset-y-0 bg-[#0b1020]"
                        style={{
                          left: `${((w.startMin - s.startMin) / (s.endMin - s.startMin)) * 100}%`,
                          width: `max(2px, ${((w.endMin - w.startMin) / (s.endMin - s.startMin)) * 100}%)`,
                        }}
                        aria-hidden
                      />
                    ))}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Comparativa semanal: un mini gráfico por métrica (sin doble eje) */
export function WeeklyMultiples({ weeks }: { weeks: WeekSummary[] }) {
  const metrics: {
    key: string;
    title: string;
    get: (w: WeekSummary) => number | null;
    fmt: (v: number) => string;
    domain?: [number, number];
    color: string;
  }[] = [
    { key: "total", title: "Sueño total / día", get: (w) => w.totalMin, fmt: (v) => formatDuration(v), color: C.highlight },
    { key: "night", title: "Sueño nocturno", get: (w) => w.nightMin, fmt: (v) => formatDuration(v), color: C.night },
    { key: "naps", title: "Siestas / día", get: (w) => w.napCount, fmt: (v) => fmtNum(v), color: C.nap },
    { key: "napMin", title: "Tiempo de siesta / día", get: (w) => w.napMin, fmt: (v) => formatDuration(v), color: C.nap },
    { key: "mood", title: "Humor al despertar", get: (w) => w.moodAfter, fmt: (v) => `${fmtNum(v)}/5`, domain: [0, 5], color: C.routine },
    { key: "routine", title: "Duración de la rutina", get: (w) => w.routineMin, fmt: (v) => formatDuration(v), color: C.routine },
    { key: "wakings", title: "Despertares / noche", get: (w) => w.wakingsPerNight, fmt: (v) => fmtNum(v), color: C.night },
    { key: "wakingMin", title: "Despierto / noche", get: (w) => w.wakingMinPerNight, fmt: (v) => formatDuration(v), color: C.night },
  ];
  const short = (w: WeekSummary) => (w.index === 0 ? "Actual" : `-${w.index} sem`);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => {
        const data = weeks.map((w) => ({ name: short(w), full: w.label, range: w.range, value: m.get(w), current: w.index === 0 }));
        const cur = data[data.length - 1]?.value;
        const prev = data[data.length - 2]?.value;
        const delta = cur != null && prev != null ? cur - prev : null;
        return (
          <div key={m.key} className="rounded-2xl border border-line bg-white/[0.02] p-4">
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-ink-2">{m.title}</p>
              {delta != null && Math.abs(delta) > 0.01 && (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                  {delta > 0 ? "▲" : "▼"} {m.fmt(Math.abs(delta))} vs sem. anterior
                </span>
              )}
            </div>
            <p className="mb-2 text-2xl font-semibold text-ink">{cur != null ? m.fmt(cur) : "—"}</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 18, right: 0, left: 0, bottom: 0 }} barCategoryGap="22%">
                  <XAxis dataKey="name" {...axisProps} tick={{ fill: C.axis, fontSize: 11 }} />
                  <YAxis hide domain={m.domain ?? [0, "auto"]} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as (typeof data)[number];
                      return <TooltipBox title={p.full} rows={[{ label: p.range, value: p.value != null ? m.fmt(p.value) : "Sin datos" }]} />;
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {data.map((d) => (
                      <Cell key={d.name} fill={d.current ? m.color : C.muted} />
                    ))}
                    {data.length <= 4 && (
                      <LabelList
                        dataKey="value"
                        position="top"
                        fill={C.axis}
                        fontSize={11}
                        formatter={(v: unknown) => (typeof v === "number" ? m.fmt(v) : "")}
                      />
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Humor medio al despertar por grupo, resaltando el mejor */
export function BucketChart({
  buckets,
  color,
  emptyText,
  metric = "mood",
}: {
  buckets: Bucket[];
  color: string;
  emptyText: string;
  metric?: "mood" | "routine";
}) {
  if (!buckets.length) return <EmptyChart text={emptyText} />;
  const data = buckets.map((b) => ({
    ...b,
    value: metric === "mood" ? b.avgMoodAfter ?? 0 : Math.round(b.avgRoutineMin ?? 0),
  }));
  const fmt = (v: number) => (metric === "mood" ? fmtNum(v) : `${v}′`);
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 4, left: -24, bottom: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis
            dataKey="label"
            {...axisProps}
            tick={{ fill: C.axis, fontSize: 11 }}
            interval={0}
            tickFormatter={(v: string) => (data.length > 6 ? v.split("–")[0] : v)}
          />
          <YAxis {...axisProps} domain={metric === "mood" ? [0, 5] : [0, "auto"]} ticks={metric === "mood" ? [0, 1, 2, 3, 4, 5] : undefined} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const b = payload[0].payload as Bucket;
              return (
                <TooltipBox
                  title={`${b.label}${b.best ? " · mejor" : ""}`}
                  rows={[
                    { label: "Humor al despertar", value: b.avgMoodAfter != null ? `${fmtNum(b.avgMoodAfter)}/5` : "—" },
                    { label: "Duración media", value: formatDuration(b.avgDurationMin) },
                    { label: "Rutina media", value: formatDuration(b.avgRoutineMin) },
                    { label: "Registros", value: String(b.count) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.best ? color : C.muted} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              fill={C.axis}
              fontSize={11}
              formatter={(v: unknown) => (typeof v === "number" && v > 0 ? fmt(v) : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EmptyChart({ text }: { text: string }) {
  return (
    <div className="grid h-40 place-items-center rounded-xl border border-dashed border-line text-center text-sm text-muted">
      <p className="max-w-xs px-4">{text}</p>
    </div>
  );
}
