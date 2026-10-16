import type { SleepSession } from "./types.ts";
import { HOUR, MINUTE, addDays, localParts, startOfLocalDay } from "./time.ts";

/** Genera ~4 semanas de datos verosímiles (solo para desarrollo local sin base de datos). */
export function demoSessions(tz: string, now = new Date()): SleepSession[] {
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const clamp = (v: number) => Math.max(1, Math.min(5, Math.round(v)));
  const todayKey = localParts(now, tz).dateKey;
  const out: SleepSession[] = [];
  let id = 0;
  const push = (kind: "nap" | "night", startMs: number, durMin: number, routineMin: number, quality: number) => {
    const end = startMs + durMin * MINUTE;
    if (startMs > now.getTime()) return;
    out.push({
      id: `demo-${++id}`,
      kind,
      routineStart: new Date(startMs - routineMin * MINUTE).toISOString(),
      sleepStart: new Date(startMs).toISOString(),
      sleepEnd: end > now.getTime() ? null : new Date(end).toISOString(),
      moodBefore: clamp(2 + rnd() * 2.5),
      moodAfter: end > now.getTime() ? null : clamp(quality + rnd() - 0.5),
      accompaniment: [pick(["Solo/a", "En brazos", "Pecho", "Mecido", "Chupete", "Ruido blanco"])],
      notes: null,
    });
  };
  for (let i = 28; i >= 0; i--) {
    const key = addDays(todayKey, -i);
    const base = startOfLocalDay(key, tz);
    // Siesta de mañana
    const m1 = 9.5 + rnd() * 1.5;
    push("nap", base + m1 * HOUR, 35 + rnd() * 50, 5 + rnd() * 25, m1 < 10.5 ? 4.3 : 3.2);
    // Siesta de tarde
    const m2 = 13 + rnd() * 2.5;
    push("nap", base + m2 * HOUR, 50 + rnd() * 70, 5 + rnd() * 30, m2 < 14 ? 4.6 : 3);
    // Noche
    const bed = 19.75 + rnd() * 2 + (i % 7 >= 5 ? 0.5 : 0);
    const dur = (10.5 - (bed - 20) * 0.6 + rnd()) * 60;
    push("night", base + bed * HOUR, dur, 10 + rnd() * 35, bed < 20.75 ? 4.5 : bed < 21.25 ? 3.6 : 2.6);
  }
  return out;
}
