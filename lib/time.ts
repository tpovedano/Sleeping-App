export const DEFAULT_TZ = "Europe/Madrid";
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    });
    partsCache.set(tz, f);
  }
  return f;
}

export interface LocalParts {
  dateKey: string; // YYYY-MM-DD
  hour: number;
  minute: number;
  weekday: number; // 0 = lunes … 6 = domingo
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function localParts(instant: Date | number, tz: string): LocalParts {
  const p: Record<string, string> = {};
  for (const part of formatter(tz).formatToParts(instant)) p[part.type] = part.value;
  return {
    dateKey: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

/** Minutos desde la medianoche local (0‒1439). */
export function minuteOfDay(instant: Date | number, tz: string): number {
  const p = localParts(instant, tz);
  return p.hour * 60 + p.minute;
}

/** Offset (ms) de la zona horaria respecto a UTC en un instante dado. */
function tzOffset(instant: number, tz: string): number {
  const p: Record<string, string> = {};
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (const part of f.formatToParts(instant)) p[part.type] = part.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Instante UTC correspondiente a la medianoche local de `dateKey`. */
export function startOfLocalDay(dateKey: string, tz: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let ts = guess - tzOffset(guess, tz);
  // Segunda pasada por si el offset cambia (horario de verano) entre la estimación y el resultado.
  ts = guess - tzOffset(ts, tz);
  return ts;
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export function formatClock(minuteOfDayValue: number): string {
  const v = ((Math.round(minuteOfDayValue) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

const SHORT_DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function weekdayOfKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function shortDayLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${SHORT_DAYS[weekdayOfKey(dateKey)]} ${d}/${m}`;
}

export function longDayLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${DAY_NAMES[weekdayOfKey(dateKey)]} ${d} ${MONTHS[m - 1]}`;
}
