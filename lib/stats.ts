import type { SleepKind, SleepSession } from "./types.ts";
import { NO_ACCOMPANIMENT, neededHelp } from "./types.ts";
import { DEFAULT_REFERENCES, WAKE_WINDOW_LABELS, type SleepReferences } from "./references.ts";
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
  /** despertares nocturnos de la noche del día */
  wakings: number;
  wakingMin: number;
  /** despertares nocturnos con toma de leche */
  milkFeeds: number;
  /** despertares durante las siestas del día */
  napWakings: number;
  /** intentos de siesta fallidos (no se durmió) */
  failedNaps: number;
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
  wakingsPerNight: number | null;
  wakingMinPerNight: number | null;
  /** hora media del «despertar dramático» (minuto del día) */
  dramaticWake: number | null;
  /** noches en las que no volvió a dormirse tras el último despertar */
  endedAwakeNights: number;
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
  /** intento de siesta fallido (no llegó a dormirse) */
  failed: boolean;
  /** despertares dentro del segmento (minutos del día) */
  wakings: { startMin: number; endMin: number }[];
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

export type RefStatus = "short" | "ok" | "long";

export interface WakeWindowStat {
  index: number;
  label: string;
  targetMin: number;
  avgMin: number | null;
  count: number;
  ok: number;
  short: number;
  long: number;
}

export interface ReferenceReport {
  refs: SleepReferences;
  napTotal: {
    days: number;
    within: number;
    below: number;
    above: number;
    avgMin: number | null;
  };
  wakeWindows: WakeWindowStat[];
  lateNaps: { count: number; totalNaps: number; latest: number | null };
  earlyWakes: { count: number; mornings: number; earliest: number | null };
}

export interface NextNap {
  /** índice de la siesta que toca (0 = primera) */
  index: number;
  atMin: number;
  targetMin: number;
  fromLabel: string;
  status: "suggested" | "too-late" | "done";
  overdue: boolean;
}

export interface NapQuality {
  /** siestas completadas en el periodo */
  naps: number;
  /** sin ningún despertar */
  uninterrupted: number;
  /** con despertares, pero se volvió a dormir sin ayuda */
  selfSettled: number;
  /** algún despertar necesitó ayuda */
  neededHelp: number;
  /** intentos fallidos */
  failed: number;
}

export interface Dashboard {
  tz: string;
  weeks: RangeWeeks;
  todayKey: string;
  today: DaySummary;
  lastNight: {
    durationMin: number;
    start: number;
    end: number;
    moodAfter: number | null;
    wakings: number;
    wakingMin: number;
    /** minuto del día del último despertar si no volvió a dormirse */
    awakeFrom: number | null;
    /** minuto del día del «despertar dramático» */
    dramaticWake: number | null;
  } | null;
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
  location: Bucket[];
  napQuality: NapQuality;
  moodFlow: { before: number; after: number; count: number }[];
  insights: Insight[];
  sessionCount: number;
  references: ReferenceReport;
  nextNap: NextNap | null;
}

interface Enriched extends SleepSession {
  start: number;
  end: number | null;
  /** sueño neto (noche: descontando despertares) */
  durationMin: number | null;
  wakingMin: number;
  routineMin: number | null;
  sleepDay: string;
  awakeBeforeMin: number | null;
  /** fin efectivo para la siguiente ventana de vigilia (siesta: «fin de la siesta» si se indicó) */
  wakeFrom: number | null;
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
 * - noche → fecha local de la tarde/noche en que empieza (inicio − 12 h, así una noche que empieza a las 00:30
 *   sigue contando para el día anterior). "Hoy" = siestas de hoy + la noche que empieza hoy.
 */
export function sleepDayOf(kind: SleepKind, start: number, tz: string): string {
  return localParts(kind === "night" ? start - 12 * HOUR : start, tz).dateKey;
}

function enrich(sessions: SleepSession[], tz: string): Enriched[] {
  const sorted = [...sessions].sort((a, b) => Date.parse(a.sleepStart) - Date.parse(b.sleepStart));
  let prevEnd: number | null = null;
  return sorted.map((s) => {
    const start = Date.parse(s.sleepStart);
    const end = s.sleepEnd ? Date.parse(s.sleepEnd) : null;
    const routine = s.routineStart ? Date.parse(s.routineStart) : null;
    const awake = prevEnd != null && start > prevEnd && start - prevEnd < 14 * HOUR ? (start - prevEnd) / MINUTE : null;
    const wakeFrom = end == null ? null : s.kind === "nap" && s.napEnd ? Math.max(end, Date.parse(s.napEnd)) : end;
    if (wakeFrom != null) prevEnd = Math.max(prevEnd ?? 0, wakeFrom);
    const gross = end != null ? (end - start) / MINUTE : null;
    const wakings = s.wakings ?? [];
    const wakingMin = Math.min(
      gross ?? Infinity,
      wakings.reduce((a, w) => a + w.durationMin, 0),
    );
    return {
      ...s,
      wakings,
      start,
      end,
      durationMin: gross != null ? gross - wakingMin : null,
      wakingMin,
      routineMin: routine != null && routine <= start ? (start - routine) / MINUTE : null,
      sleepDay: sleepDayOf(s.kind, start, tz),
      awakeBeforeMin: awake,
      wakeFrom,
    };
  });
}

function summarizeDay(dateKey: string, items: Enriched[], failedNaps = 0): DaySummary {
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
    wakings: night.reduce((a, s) => a + s.wakings.length, 0),
    wakingMin: night.reduce((a, s) => a + s.wakingMin, 0),
    milkFeeds: night.reduce((a, s) => a + s.wakings.filter((w) => w.milk).length, 0),
    napWakings: naps.reduce((a, s) => a + s.wakings.length, 0),
    failedNaps,
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
    wakingsPerNight: mean(nights.map((s) => s.wakings.length)),
    wakingMinPerNight: mean(nights.map((s) => s.wakingMin)),
    dramaticWake: clockMean(
      nights.filter((s) => s.dramaticWake).map((s) => minuteOfDay(Date.parse(s.dramaticWake!), tz)),
      0,
    ),
    endedAwakeNights: nights.filter((s) => s.wakings.some((w) => w.final)).length,
  };
}

/** Despertar de la mañana y ventanas de vigilia de un día (despertar → 1ª siesta, 1ª → 2ª…). */
function dayWindows(all: Enriched[], dateKey: string, tz: string) {
  const naps = all.filter((s) => s.kind === "nap" && s.sleepDay === dateKey).sort((a, b) => a.start - b.start);
  const firstNap = naps[0]?.start ?? Infinity;
  let morningWake: number | null = null;
  for (const s of all) {
    if (s.kind !== "night" || s.end == null || s.end > firstNap) continue;
    if (localParts(s.end, tz).dateKey !== dateKey) continue;
    morningWake = Math.max(morningWake ?? 0, s.end);
  }
  const windows: (number | null)[] = naps.map((n, i) => {
    const prevEnd = i === 0 ? morningWake : naps[i - 1].wakeFrom;
    return prevEnd != null && n.start > prevEnd ? (n.start - prevEnd) / MINUTE : null;
  });
  return { morningWake, naps, windows };
}

export function refStatus(actual: number, target: number, tolerance: number): RefStatus {
  if (actual < target - tolerance) return "short";
  if (actual > target + tolerance) return "long";
  return "ok";
}

function buildReferenceReport(
  all: Enriched[],
  pastDays: DaySummary[],
  dayKeys: string[],
  firstKey: string,
  todayKey: string,
  tz: string,
  refs: SleepReferences,
): ReferenceReport {
  const napDays = pastDays.filter((d) => d.hasData);
  const napTotal = {
    days: napDays.length,
    within: napDays.filter((d) => d.napMin >= refs.napTotalMin.min && d.napMin <= refs.napTotalMin.max).length,
    below: napDays.filter((d) => d.napMin < refs.napTotalMin.min).length,
    above: napDays.filter((d) => d.napMin > refs.napTotalMin.max).length,
    avgMin: mean(napDays.map((d) => d.napMin)),
  };

  const samples: number[][] = refs.wakeWindowsMin.map(() => []);
  for (const key of dayKeys) {
    dayWindows(all, key, tz).windows.forEach((w, i) => {
      if (w != null && i < samples.length) samples[i].push(w);
    });
  }
  const wakeWindows: WakeWindowStat[] = refs.wakeWindowsMin.map((target, i) => {
    const st = samples[i].map((v) => refStatus(v, target, refs.wakeWindowToleranceMin));
    return {
      index: i,
      label: WAKE_WINDOW_LABELS[i] ?? `Ventana ${i + 1}`,
      targetMin: target,
      avgMin: mean(samples[i]),
      count: samples[i].length,
      ok: st.filter((x) => x === "ok").length,
      short: st.filter((x) => x === "short").length,
      long: st.filter((x) => x === "long").length,
    };
  });

  const inRangeNaps = all.filter((s) => s.kind === "nap" && s.sleepDay >= firstKey && s.sleepDay <= todayKey);
  const napStarts = inRangeNaps.map((s) => minuteOfDay(s.start, tz));
  const late = napStarts.filter((m) => m > refs.latestNapStart);

  const morningEnds = all
    .filter((s) => s.kind === "night" && s.end != null)
    .filter((s) => {
      const k = localParts(s.end!, tz).dateKey;
      return k >= firstKey && k <= todayKey;
    })
    .map((s) => minuteOfDay(s.end!, tz));
  const early = morningEnds.filter((m) => m < refs.earliestMorningWake);

  return {
    refs,
    napTotal,
    wakeWindows,
    lateNaps: { count: late.length, totalNaps: napStarts.length, latest: late.length ? Math.max(...late) : null },
    earlyWakes: { count: early.length, mornings: morningEnds.length, earliest: early.length ? Math.min(...early) : null },
  };
}

/** Siguiente siesta recomendada para hoy según las ventanas de vigilia de referencia. */
function suggestNextNap(all: Enriched[], now: number, todayKey: string, tz: string, refs: SleepReferences): NextNap | null {
  if (all.some((s) => s.end == null && now - s.start < DAY)) return null;
  const { morningWake, naps } = dayWindows(all, todayKey, tz);
  if (morningWake == null && !naps.length) return null;
  const lastEnd = naps.length ? naps[naps.length - 1].wakeFrom : morningWake;
  if (lastEnd == null) return null;
  const index = naps.length;
  const fromLabel = index === 0 ? "el despertar" : `la ${index}ª siesta`;
  if (index >= refs.wakeWindowsMin.length) {
    return { index, atMin: minuteOfDay(lastEnd, tz), targetMin: 0, fromLabel, status: "done", overdue: false };
  }
  const targetMin = refs.wakeWindowsMin[index];
  const at = lastEnd + targetMin * MINUTE;
  const atMin = minuteOfDay(at, tz);
  const tooLate = localParts(at, tz).dateKey !== todayKey || atMin > refs.latestNapStart;
  return { index, atMin, targetMin, fromLabel, status: tooLate ? "too-late" : "suggested", overdue: !tooLate && now > at };
}

/** Agrupa por etiquetas (un registro puede tener varias) y ordena por frecuencia. */
function tagBuckets(items: Enriched[], tagsOf: (s: Enriched) => string[]): Bucket[] {
  const map = new Map<string, Enriched[]>();
  for (const s of items) for (const t of tagsOf(s)) map.set(t, [...(map.get(t) ?? []), s]);
  const buckets: Bucket[] = [...map.entries()]
    .map(([key, list]) => ({
      key,
      label: key,
      count: list.length,
      avgMoodAfter: mean(nums(list.map((s) => s.moodAfter))),
      avgDurationMin: mean(nums(list.map((s) => s.durationMin))),
      avgRoutineMin: mean(nums(list.map((s) => s.routineMin))),
    }))
    .sort((a, b) => b.count - a.count);
  markBest(buckets);
  return buckets;
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
  opts: { now?: Date; tz: string; weeks: RangeWeeks; refs?: SleepReferences },
): Dashboard {
  const { tz, weeks } = opts;
  const refs = opts.refs ?? DEFAULT_REFERENCES;
  const now = (opts.now ?? new Date()).getTime();
  const todayKey = localParts(now, tz).dateKey;
  const rangeDays = weeks * 7;
  const firstKey = addDays(todayKey, -(rangeDays - 1));

  // Los intentos fallidos no cuentan como sueño: se tratan aparte
  const all = enrich(
    sessions.filter((s) => !s.failed),
    tz,
  );
  const failedAll = sessions
    .filter((s) => s.failed && s.sleepEnd)
    .map((s) => ({ ...s, start: Date.parse(s.sleepStart), end: Date.parse(s.sleepEnd!), sleepDay: sleepDayOf("nap", Date.parse(s.sleepStart), tz) }));
  const failedByDay = new Map<string, number>();
  for (const f of failedAll) failedByDay.set(f.sleepDay, (failedByDay.get(f.sleepDay) ?? 0) + 1);
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
    days.push(summarizeDay(key, byDay.get(key) ?? [], failedByDay.get(key) ?? 0));
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
        durationMin: (end - s.start) / MINUTE - s.wakingMin,
        wakings: s.wakings
          .map((w) => {
            const ws = Math.max(Date.parse(w.at), a);
            const we = Math.min(Date.parse(w.at) + w.durationMin * MINUTE, b);
            return { startMin: ((ws - dayStart) / span) * 1440, endMin: ((we - dayStart) / span) * 1440 };
          })
          .filter((w) => w.endMin > w.startMin),
        failed: false,
      });
    }
    for (const f of failedAll) {
      if (f.end <= dayStart || f.start >= dayEnd) continue;
      const a = Math.max(f.start, dayStart);
      const b = Math.min(f.end, dayEnd);
      segments.push({
        kind: "nap",
        startMin: ((a - dayStart) / span) * 1440,
        endMin: ((b - dayStart) / span) * 1440,
        inProgress: false,
        moodAfter: f.moodAfter,
        durationMin: (f.end - f.start) / MINUTE,
        wakings: [],
        failed: true,
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
  const routine = bucketize(completed, (s) =>
    s.routineStart == null
      ? { key: "none", label: "Sin rutina", order: -1 }
      : rangeBucket(s.routineMin, [10, 20, 30, 45], minutesRangeLabel),
  );
  const wakeWindow = bucketize(naps, (s) =>
    rangeBucket(s.awakeBeforeMin, [60, 120, 180, 240, 360], hoursRangeLabel),
  );

  const accompaniment = tagBuckets(completed, (s) => (s.accompaniment.length ? s.accompaniment : [NO_ACCOMPANIMENT]));
  const location = tagBuckets(completed, (s) => (s.location ? [s.location] : []));

  const napQuality: NapQuality = {
    naps: naps.length,
    uninterrupted: naps.filter((n) => !n.wakings.length).length,
    selfSettled: naps.filter((n) => n.wakings.length && !n.wakings.some(neededHelp)).length,
    neededHelp: naps.filter((n) => n.wakings.some(neededHelp)).length,
    failed: failedAll.filter((f) => f.sleepDay >= firstKey && f.sleepDay <= todayKey).length,
  };

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
          wakings: lastNightS.wakings.length,
          wakingMin: lastNightS.wakingMin,
          awakeFrom: (() => {
            const f = lastNightS.wakings.find((w) => w.final);
            return f ? minuteOfDay(Date.parse(f.at), tz) : null;
          })(),
          dramaticWake: lastNightS.dramaticWake ? minuteOfDay(Date.parse(lastNightS.dramaticWake), tz) : null,
        }
      : null;
  const open = [...all].reverse().find((s) => s.end == null && now - s.start < DAY);
  const inProgress = open ? { kind: open.kind, sinceMin: (now - open.start) / MINUTE } : null;

  const references = buildReferenceReport(
    all,
    pastDays,
    days.map((d) => d.dateKey),
    firstKey,
    todayKey,
    tz,
    refs,
  );
  const nextNap = suggestNextNap(all, now, todayKey, tz, refs);

  const insights = buildInsights({
    references,
    napQuality,
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
    location,
    napQuality,
    moodFlow,
    insights,
    sessionCount: completed.length,
    references,
    nextNap,
  };
}

function buildInsights(ctx: {
  references: ReferenceReport;
  napQuality: NapQuality;
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
  out.push(...referenceInsights(ctx.references, ctx.baseline));
  const q = ctx.napQuality;
  if (q.naps >= 3) {
    const pct = Math.round((q.uninterrupted / q.naps) * 100);
    out.push({
      id: "nap-quality",
      icon: "sun",
      tone: q.neededHelp > q.naps / 3 ? "warn" : pct >= 60 ? "good" : "info",
      title: `${pct} % de las siestas sin despertares`,
      body: `${q.uninterrupted} de corrido · ${q.selfSettled} con despertares pero se volvió a dormir sola · ${q.neededHelp} necesitaron ayuda para volver a dormirse.`,
    });
  }
  if (q.failed > 0) {
    out.push({
      id: "failed-naps",
      icon: "sun",
      tone: "warn",
      title: `${q.failed} ${q.failed === 1 ? "siesta fallida" : "siestas fallidas"}`,
      body: "Intentos en los que no llegó a dormirse. Revisa si coinciden con ventanas de vigilia más cortas de lo recomendado.",
    });
  }
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

function referenceInsights(rep: ReferenceReport, baseline: PeriodAverages): Insight[] {
  const out: Insight[] = [];
  const { refs } = rep;
  const range = `${fmtNum(refs.napTotalMin.min / 60)}–${fmtNum(refs.napTotalMin.max / 60)} h`;
  if (rep.napTotal.days >= 3 && rep.napTotal.avgMin != null) {
    const avg = rep.napTotal.avgMin;
    const inRange = avg >= refs.napTotalMin.min && avg <= refs.napTotalMin.max;
    out.push({
      id: "ref-nap-total",
      icon: "sun",
      tone: inRange ? "good" : "warn",
      title: inRange
        ? `Siestas dentro de la referencia (${range})`
        : avg < refs.napTotalMin.min
          ? `Siestas por debajo de la referencia (${range})`
          : `Siestas por encima de la referencia (${range})`,
      body: `Media de ${formatDuration(avg)} de siesta al día. ${rep.napTotal.within} de ${rep.napTotal.days} días dentro del rango.`,
    });
  }
  const measured = rep.wakeWindows.filter((w) => w.count >= 2 && w.avgMin != null);
  if (measured.length) {
    const worst = [...measured].sort(
      (a, b) => Math.abs(b.avgMin! - b.targetMin) - Math.abs(a.avgMin! - a.targetMin),
    )[0];
    const diff = worst.avgMin! - worst.targetMin;
    if (Math.abs(diff) > refs.wakeWindowToleranceMin) {
      out.push({
        id: "ref-wake-window",
        icon: "hourglass",
        tone: "warn",
        title: `Ventana «${worst.label}» ${diff < 0 ? "más corta" : "más larga"} de lo recomendado`,
        body: `De media ${formatDuration(worst.avgMin)} frente a ${formatDuration(worst.targetMin)} de referencia (${formatDuration(Math.abs(diff))} ${diff < 0 ? "menos" : "más"}).`,
      });
    } else {
      out.push({
        id: "ref-wake-window",
        icon: "hourglass",
        tone: "good",
        title: "Ventanas de vigilia alineadas con la referencia",
        body: `Todas las ventanas medidas están a menos de ${refs.wakeWindowToleranceMin} min del objetivo.`,
      });
    }
  }
  if (rep.lateNaps.count > 0) {
    out.push({
      id: "ref-late-naps",
      icon: "sun",
      tone: "warn",
      title: `${rep.lateNaps.count} ${rep.lateNaps.count === 1 ? "siesta empezó" : "siestas empezaron"} después de las ${formatClock(refs.latestNapStart)}`,
      body: `La más tardía empezó a las ${formatClock(rep.lateNaps.latest!)}. Las siestas tardías pueden retrasar la hora de dormir.`,
    });
  }
  if (rep.earlyWakes.count > 0) {
    out.push({
      id: "ref-early-wakes",
      icon: "moon",
      tone: "warn",
      title: `${rep.earlyWakes.count} ${rep.earlyWakes.count === 1 ? "despertar" : "despertares"} antes de las ${formatClock(refs.earliestMorningWake)}`,
      body: `De ${rep.earlyWakes.mornings} mañanas registradas; el más temprano fue a las ${formatClock(rep.earlyWakes.earliest!)}.`,
    });
  }
  if (baseline.wakingsPerNight != null && baseline.wakingsPerNight > 0) {
    out.push({
      id: "night-wakings",
      icon: "moon",
      tone: baseline.wakingsPerNight <= 1 ? "info" : "warn",
      title: `${fmtNum(baseline.wakingsPerNight)} despertares por noche de media`,
      body: `Unos ${formatDuration(baseline.wakingMinPerNight)} despierto/a cada noche.`,
    });
  }
  return out;
}

/** Recomendación de próxima siesta a partir de los registros (para la página de registro). */
export function nextNapFor(
  sessions: SleepSession[],
  opts: { now?: Date; tz: string; refs?: SleepReferences },
): NextNap | null {
  const now = (opts.now ?? new Date()).getTime();
  return suggestNextNap(enrich(sessions.filter((s) => !s.failed), opts.tz), now, localParts(now, opts.tz).dateKey, opts.tz, opts.refs ?? DEFAULT_REFERENCES);
}
