import type { SleepKind, SleepSession } from "./types.ts";
import { NO_ACCOMPANIMENT } from "./types.ts";
import {
  DAY,
  HOUR,
  MINUTE,
  addDays,
  formatClock,
  formatDuration,
  localParts,
  minuteOfDay,
  shortDayLabel,
  startOfLocalDay,
} from "./time.ts";

export type RangeWeeks = 1 | 2 | 3 | 4;

export interface DaySummary {
  dateKey: string;
  label: string;
  nightMin: number;
  napMin: number;
  totalMin: number;
  napCount: number;
  nightCount: number;
  moodAfterAvg: number | null;
  hasData: boolean;
}

export interface PeriodAverages {
  days: number; // días con datos
  totalMin: number | null;
  nightMin: number | null;
  napMin: number | null;
  napCount: number | null;
  moodAfter: number | null;
  moodBefore: number | null;
  routineMin: number | null;
  bedtime: number | null; // minuto del día
  wakeTime: number | null; // minuto del día
}

export interface WeekSummary extends PeriodAverages {
  index: number;
  label: string;
  range: string;
}

export interface Bucket {
  key: string;
  label: string;
  count: number;
  avgMoodAfter: number | null;
  avgDurationMin: number | null;
  avgRoutineMin: number | null;
  best?: boolean;
}

export interface TimelineSegment {
  kind: SleepKind;
  startMin: number;
  endMin: number;
  inProgress: boolean;
  moodAfter: number | null;
  durationMin: number;
}

export interface TimelineDay {
  dateKey: string;
  label: string;
  segments: TimelineSegment[];
}

export type InsightTone = "good" | "info" | "warn";

export interface Insight {
  id: string;
  title: string;
  body: string;
  tone: InsightTone;
  icon: "sun" | "moon" | "timer" | "hourglass" | "hand" | "trend-up" | "trend-down" | "target";
}

export interface Dashboard {
  tz: string;
  weeks: RangeWeeks;
  todayKey: string;
  today: DaySummary;
  lastNight: { durationMin: number; start: number; end: number; moodAfter: number | null } | null;
  inProgress: { kind: SleepKind; sinceMin: number } | null;
  baseline: PeriodAverages;
  days: DaySummary[];
  weekSummaries: WeekSummary[];
  timeline: TimelineDay[];
  napStart: Bucket[];
  bedtime: Bucket[];
  routine: Bucket[];
  wakeWindow: Bucket[];
  accompaniment: Bucket[];
  moodFlow: { before: number; after: number; count: number }[];
  insights: Insight[];
  sessionCount: number;
}

interface Enriched extends SleepSession {
  start: number;
  end: number | null;
  durationMin: number | null;
  routineMin: number | null;
  sleepDay: string;
  awakeBeforeMin: number | null;
}

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const nums = (xs: (number | null | undefined)[]): number[] =>
  xs.filter((x): x is number => typeof x === "number" && Number.isFinite(x));

/** Media de horas del reloj que cruzan la medianoche (pivotando en el mediodía). */
function clockMean(minutes: number[], pivot = 720): number | null {
  if (!minutes.length) return null;
  const shifted = minutes.map((m) => (m - pivot + 1440) % 1440);
  return ((mean(shifted)! + pivot) % 1440 + 1440) % 1440;
}

function clockStdDev(minutes: number[], pivot = 720): number | null {
  if (minutes.length < 3) return null;
  const shifted = minutes.map((m) => (m - pivot + 1440) % 1440);
  const mu = mean(shifted)!;
  return Math.sqrt(mean(shifted.map((x) => (x - mu) ** 2))!);
}

export const fmtNum = (n: number, digits = 1) =>
  n.toLocaleString("es-ES", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/**
 * Día de sueño al que se atribuye un registro:
 * - siesta → fecha local de inicio
 * - noche → fecha local de la mañana en que termina (inicio + 12 h), así "hoy" = noche anterior + siestas de hoy
 */
export function sleepDayOf(kind: SleepKind, start: number, tz: string): string {
  return localParts(kind === "night" ? start + 12 * HOUR : start, tz).dateKey;
}

function enrich(sessions: SleepSession[], tz: string): Enriched[] {
  const sorted = [...sessions].sort((a, b) => Date.parse(a.sleepStart) - Date.parse(b.sleepStart));
  let prevEnd: number | null = null;
  return sorted.map((s) => {
    const start = Date.parse(s.sleepStart);
    const end = s.sleepEnd ? Date.parse(s.sleepEnd) : null;
    const routine = s.routineStart ? Date.parse(s.routineStart) : null;
    const awake = prevEnd != null && start > prevEnd && start - prevEnd < 14 * HOUR ? (start - prevEnd) / MINUTE : null;
    if (end != null) prevEnd = Math.max(prevEnd ?? 0, end);
    return {
      ...s,
      start,
      end,
      durationMin: end != null ? (end - start) / MINUTE : null,
      routineMin: routine != null && routine <= start ? (start - routine) / MINUTE : null,
      sleepDay: sleepDayOf(s.kind, start, tz),
      awakeBeforeMin: awake,
    };
  });
}

function summarizeDay(dateKey: string, items: Enriched[]): DaySummary {
  const done = items.filter((s) => s.durationMin != null);
  const night = done.filter((s) => s.kind === "night");
  const naps = done.filter((s) => s.kind === "nap");
  const nightMin = night.reduce((a, s) => a + s.durationMin!, 0);
  const napMin = naps.reduce((a, s) => a + s.durationMin!, 0);
  return {
    dateKey,
    label: shortDayLabel(dateKey),
    nightMin,
    napMin,
    totalMin: nightMin + napMin,
    napCount: naps.length,
    nightCount: night.length,
    moodAfterAvg: mean(nums(done.map((s) => s.moodAfter))),
    hasData: done.length > 0,
  };
}

function averages(days: DaySummary[], sessions: Enriched[], tz: string): PeriodAverages {
  const withData = days.filter((d) => d.hasData);
  const done = sessions.filter((s) => s.durationMin != null);
  const nights = done.filter((s) => s.kind === "night");
  return {
    days: withData.length,
    totalMin: mean(withData.map((d) => d.totalMin)),
    nightMin: mean(withData.filter((d) => d.nightCount > 0).map((d) => d.nightMin)),
    napMin: mean(withData.map((d) => d.napMin)),
    napCount: mean(withData.map((d) => d.napCount)),
    moodAfter: mean(nums(done.map((s) => s.moodAfter))),
    moodBefore: mean(nums(done.map((s) => s.moodBefore))),
    routineMin: mean(nums(done.map((s) => s.routineMin))),
    bedtime: clockMean(nights.map((s) => minuteOfDay(s.start, tz))),
    wakeTime: clockMean(nights.map((s) => minuteOfDay(s.end!, tz)), 0),
  };
}

function bucketize<T extends Enriched>(
  items: T[],
  keyOf: (s: T) => { key: string; label: string; order: number } | null,
): Bucket[] {
  const groups = new Map<string, { label: string; order: number; items: T[] }>();
  for (const s of items) {
    const k = keyOf(s);
    if (!k) continue;
    const g = groups.get(k.key) ?? { label: k.label, order: k.order, items: [] };
    g.items.push(s);
    groups.set(k.key, g);
  }
  const buckets = [...groups.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, g]) => ({
      key,
      label: g.label,
      count: g.items.length,
      avgMoodAfter: mean(nums(g.items.map((s) => s.moodAfter))),
      avgDurationMin: mean(nums(g.items.map((s) => s.durationMin))),
      avgRoutineMin: mean(nums(g.items.map((s) => s.routineMin))),
    }));
  markBest(buckets);
  return buckets;
}

/** Marca el mejor grupo: mayor humor al despertar (desempata la duración); exige ≥2 muestras si es posible. */
function markBest(buckets: Bucket[]) {
  const scored = buckets.filter((b) => b.avgMoodAfter != null);
  if (!scored.length) return;
  const minCount = scored.some((b) => b.count >= 2) ? 2 : 1;
  const pool = scored.filter((b) => b.count >= minCount);
  pool.sort(
    (a, b) =>
      b.avgMoodAfter! - a.avgMoodAfter! ||
      (b.avgDurationMin ?? 0) - (a.avgDurationMin ?? 0) ||
      b.count - a.count,
  );
  pool[0].best = true;
}

const best = (buckets: Bucket[]) => buckets.find((b) => b.best);

function hourBucket(minute: number, size: number) {
  const startM = Math.floor(minute / size) * size;
  return { key: String(startM), label: `${formatClock(startM)}–${formatClock(startM + size)}`, order: startM };
}

function rangeBucket(value: number | null, edges: number[], fmt: (lo: number, hi?: number) => string) {
  if (value == null) return null;
  for (let i = 0; i < edges.length; i++) {
    if (value < edges[i]) return { key: `b${i}`, label: fmt(i === 0 ? 0 : edges[i - 1], edges[i]), order: i };
  }
  return { key: `b${edges.length}`, label: fmt(edges[edges.length - 1]), order: edges.length };
}

const minutesRangeLabel = (lo: number, hi?: number) =>
  hi == null ? `> ${lo} min` : lo === 0 ? `< ${hi} min` : `${lo}–${hi} min`;

const hoursRangeLabel = (lo: number, hi?: number) => {
  const h = (m: number) => fmtNum(m / 60);
  return hi == null ? `> ${h(lo)} h` : lo === 0 ? `< ${h(hi)} h` : `${h(lo)}–${h(hi)} h`;
};

export function buildDashboard(
  sessions: SleepSession[],
  opts: { now?: Date; tz: string; weeks: RangeWeeks },
): Dashboard {
  const { tz, weeks } = opts;
  const now = (opts.now ?? new Date()).getTime();
  const todayKey = localParts(now, tz).dateKey;
  const rangeDays = weeks * 7;
  const firstKey = addDays(todayKey, -(rangeDays - 1));

  const all = enrich(sessions, tz);
  const inRange = all.filter((s) => s.sleepDay >= firstKey && s.sleepDay <= todayKey);
  const completed = inRange.filter((s) => s.durationMin != null);

  const byDay = new Map<string, Enriched[]>();
  for (const s of inRange) {
    const list = byDay.get(s.sleepDay) ?? [];
    list.push(s);
    byDay.set(s.sleepDay, list);
  }

  const days: DaySummary[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const key = addDays(todayKey, -i);
    days.push(summarizeDay(key, byDay.get(key) ?? []));
  }
  const today = days[days.length - 1];
  const pastDays = days.slice(0, -1);
  const baseline = averages(
    pastDays,
    completed.filter((s) => s.sleepDay !== todayKey),
    tz,
  );

  const weekSummaries: WeekSummary[] = [];
  for (let w = 0; w < weeks; w++) {
    const endKey = addDays(todayKey, -7 * w);
    const startKey = addDays(endKey, -6);
    const wDays = days.filter((d) => d.dateKey >= startKey && d.dateKey <= endKey);
    const wSessions = completed.filter((s) => s.sleepDay >= startKey && s.sleepDay <= endKey);
    weekSummaries.push({
      ...averages(wDays, wSessions, tz),
      index: w,
      label: w === 0 ? "Últimos 7 días" : w === 1 ? "Hace 1 semana" : `Hace ${w} semanas`,
      range: `${shortDayLabel(startKey).slice(2)} – ${shortDayLabel(endKey).slice(2)}`,
    });
  }
  weekSummaries.reverse();

  // Línea de tiempo por día natural (00:00–24:00)
  const timeline: TimelineDay[] = days.map((d) => {
    const dayStart = startOfLocalDay(d.dateKey, tz);
    const dayEnd = startOfLocalDay(addDays(d.dateKey, 1), tz);
    const span = dayEnd - dayStart;
    const segments: TimelineSegment[] = [];
    for (const s of all) {
      const end = s.end ?? now;
      if (end <= dayStart || s.start >= dayEnd) continue;
      const a = Math.max(s.start, dayStart);
      const b = Math.min(end, dayEnd);
      segments.push({
        kind: s.kind,
        startMin: ((a - dayStart) / span) * 1440,
        endMin: ((b - dayStart) / span) * 1440,
        inProgress: s.end == null,
        moodAfter: s.moodAfter,
        durationMin: (end - s.start) / MINUTE,
      });
    }
    return { dateKey: d.dateKey, label: d.label, segments };
  });

  const naps = completed.filter((s) => s.kind === "nap");
  const nights = completed.filter((s) => s.kind === "night");

  const napStart = bucketize(naps, (s) => hourBucket(minuteOfDay(s.start, tz), 60));
  const bedtime = bucketize(nights, (s) => {
    const m = minuteOfDay(s.start, tz);
    const b = hourBucket(m, 30);
    // ordena las horas de la noche después de las de la tarde
    return { ...b, order: (Number(b.key) - 720 + 1440) % 1440 };
  });
  const routine = bucketize(completed, (s) => rangeBucket(s.routineMin, [10, 20, 30, 45], minutesRangeLabel));
  const wakeWindow = bucketize(naps, (s) =>
    rangeBucket(s.awakeBeforeMin, [60, 120, 180, 240, 360], hoursRangeLabel),
  );

  const accMap = new Map<string, Enriched[]>();
  for (const s of completed) {
    const tags = s.accompaniment.length ? s.accompaniment : [NO_ACCOMPANIMENT];
    for (const t of tags) accMap.set(t, [...(accMap.get(t) ?? []), s]);
  }
  const accompaniment: Bucket[] = [...accMap.entries()]
    .map(([key, items]) => ({
      key,
      label: key,
      count: items.length,
      avgMoodAfter: mean(nums(items.map((s) => s.moodAfter))),
      avgDurationMin: mean(nums(items.map((s) => s.durationMin))),
      avgRoutineMin: mean(nums(items.map((s) => s.routineMin))),
    }))
    .sort((a, b) => b.count - a.count);
  markBest(accompaniment);

  const flow = new Map<string, number>();
  for (const s of completed) {
    if (s.moodBefore == null || s.moodAfter == null) continue;
    const k = `${s.moodBefore}-${s.moodAfter}`;
    flow.set(k, (flow.get(k) ?? 0) + 1);
  }
  const moodFlow = [...flow.entries()].map(([k, count]) => {
    const [before, after] = k.split("-").map(Number);
    return { before, after, count };
  });

  // Último sueño nocturno terminado
  const lastNightS = [...all].reverse().find((s) => s.kind === "night" && s.end != null);
  const lastNight =
    lastNightS && now - lastNightS.end! < 1.5 * DAY
      ? {
          durationMin: lastNightS.durationMin!,
          start: minuteOfDay(lastNightS.start, tz),
          end: minuteOfDay(lastNightS.end!, tz),
          moodAfter: lastNightS.moodAfter,
        }
      : null;
  const open = [...all].reverse().find((s) => s.end == null && now - s.start < DAY);
  const inProgress = open ? { kind: open.kind, sinceMin: (now - open.start) / MINUTE } : null;

  const insights = buildInsights({
    napStart,
    bedtime,
    routine,
    wakeWindow,
    accompaniment,
    weekSummaries,
    nights,
    tz,
    today,
    baseline,
  });

  return {
    tz,
    weeks,
    todayKey,
    today,
    lastNight,
    inProgress,
    baseline,
    days,
    weekSummaries,
    timeline,
    napStart,
    bedtime,
    routine,
    wakeWindow,
    accompaniment,
    moodFlow,
    insights,
    sessionCount: completed.length,
  };
}

function buildInsights(ctx: {
  napStart: Bucket[];
  bedtime: Bucket[];
  routine: Bucket[];
  wakeWindow: Bucket[];
  accompaniment: Bucket[];
  weekSummaries: WeekSummary[];
  nights: Enriched[];
  tz: string;
  today: DaySummary;
  baseline: PeriodAverages;
}): Insight[] {
  const out: Insight[] = [];
  const mood = (b: Bucket) => `${fmtNum(b.avgMoodAfter!)}/5`;
  const n = (b: Bucket, noun: [string, string]) => `${b.count} ${b.count === 1 ? noun[0] : noun[1]}`;

  const bt = best(ctx.bedtime);
  if (bt) {
    out.push({
      id: "bedtime",
      icon: "moon",
      tone: "good",
      title: `Mejor hora para dormir: ${bt.label}`,
      body: `Las noches que empiezan en esa franja terminan con un humor medio de ${mood(bt)} y duran ${formatDuration(bt.avgDurationMin)} (${n(bt, ["noche", "noches"])}).`,
    });
  }
  const ns = best(ctx.napStart);
  if (ns) {
    out.push({
      id: "nap",
      icon: "sun",
      tone: "good",
      title: `Mejor hora de siesta: ${ns.label}`,
      body: `Despertar con humor de ${mood(ns)} y una duración media de ${formatDuration(ns.avgDurationMin)} (${n(ns, ["siesta", "siestas"])}).`,
    });
  }
  const ww = best(ctx.wakeWindow);
  if (ww) {
    out.push({
      id: "wake-window",
      icon: "hourglass",
      tone: "info",
      title: `Tiempo despierto ideal antes de la siesta: ${ww.label}`,
      body: `Con esa ventana de vigilia las siestas acaban con humor de ${mood(ww)} y duran ${formatDuration(ww.avgDurationMin)}.`,
    });
  }
  const rt = best(ctx.routine);
  if (rt) {
    out.push({
      id: "routine",
      icon: "timer",
      tone: "info",
      title: `Rutina más eficaz: ${rt.label}`,
      body: `Cuando la rutina dura eso hasta quedarse dormido, el humor al despertar es de ${mood(rt)} (${n(rt, ["registro", "registros"])}).`,
    });
  }
  const accWithRoutine = ctx.accompaniment.filter((b) => b.avgRoutineMin != null && b.count >= 2);
  if (accWithRoutine.length >= 2) {
    const fastest = [...accWithRoutine].sort((a, b) => a.avgRoutineMin! - b.avgRoutineMin!)[0];
    out.push({
      id: "accompaniment",
      icon: "hand",
      tone: "info",
      title: `Se duerme antes con: ${fastest.label}`,
      body: `De media pasan ${formatDuration(fastest.avgRoutineMin)} desde el inicio de la rutina hasta dormirse (${n(fastest, ["vez", "veces"])}).`,
    });
  }

  const [prev, cur] = ctx.weekSummaries.slice(-2);
  if (prev && cur && prev.totalMin != null && cur.totalMin != null) {
    const diff = cur.totalMin - prev.totalMin;
    if (Math.abs(diff) >= 10) {
      out.push({
        id: "trend",
        icon: diff > 0 ? "trend-up" : "trend-down",
        tone: diff > 0 ? "good" : "warn",
        title: diff > 0 ? "Esta semana se duerme más" : "Esta semana se duerme menos",
        body: `${formatDuration(Math.abs(diff))} ${diff > 0 ? "más" : "menos"} al día que la semana anterior (${formatDuration(cur.totalMin)} frente a ${formatDuration(prev.totalMin)}).`,
      });
    }
  }

  const sd = clockStdDev(ctx.nights.map((s) => minuteOfDay(s.start, ctx.tz)));
  if (sd != null) {
    const regular = sd <= 30;
    out.push({
      id: "consistency",
      icon: "target",
      tone: regular ? "good" : "warn",
      title: regular ? "Horario de noche muy regular" : "Horario de noche irregular",
      body: `La hora de dormirse varía ±${Math.round(sd)} min. ${regular ? "¡Mantener esa constancia ayuda mucho!" : "Intentar acostarse a una hora más fija suele mejorar el descanso."}`,
    });
  }
  return out;
}
