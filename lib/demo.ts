import type { NightWaking, SleepSession } from "./types.ts";
import { HOUR, MINUTE, addDays, localParts, startOfLocalDay } from "./time.ts";

/** Genera ~4 semanas de datos verosímiles (solo para desarrollo local sin base de datos). */
export function demoSessions(tz: string, now = new Date()): SleepSession[] {
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const jitter = (min: number) => (rnd() * 2 - 1) * min;
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const clamp = (v: number) => Math.max(1, Math.min(5, Math.round(v)));
  const nowMs = now.getTime();
  const todayKey = localParts(now, tz).dateKey;
  const out: SleepSession[] = [];
  let id = 0;
  const acc = () => [pick(["Solo/a", "En brazos", "Pecho", "Mecido", "Chupete", "Cama", "Mano encima"])];

  const push = (
    kind: "nap" | "night",
    startMs: number,
    durMin: number,
    routineMin: number,
    quality: number,
    wakings: NightWaking[] = [],
  ): number | null => {
    if (startMs > nowMs) return null;
    const end = startMs + durMin * MINUTE;
    const done = end <= nowMs;
    out.push({
      id: `demo-${++id}`,
      kind,
      routineStart: new Date(startMs - routineMin * MINUTE).toISOString(),
      sleepStart: new Date(startMs).toISOString(),
      sleepEnd: done ? new Date(end).toISOString() : null,
      moodBefore: clamp(2 + rnd() * 2.5),
      moodAfter: done ? clamp(quality + rnd() - 0.5) : null,
      accompaniment: acc(),
      wakings: done ? wakings.filter((w) => Date.parse(w.at) < end) : [],
      notes: null,
    });
    return done ? end : null;
  };

  const targets = [120, 150, 150, 120];
  let morningWake = startOfLocalDay(addDays(todayKey, -29), tz) + 6.5 * HOUR;
  for (let i = 28; i >= 0; i--) {
    const key = addDays(todayKey, -i);
    const base = startOfLocalDay(key, tz);
    // Siestas encadenadas con ventanas de vigilia cercanas (o no) a la referencia
    let lastEnd: number | null = morningWake;
    const napCount = rnd() < 0.3 ? 4 : 3;
    for (let n = 0; n < napCount && lastEnd != null; n++) {
      const off = jitter(40);
      const start = lastEnd + (targets[n] + off) * MINUTE;
      if (start > base + 17.75 * HOUR) break;
      const quality = 4.6 - Math.abs(off) / 18;
      const dur = n === napCount - 1 ? 25 + rnd() * 20 : 35 + rnd() * 45;
      lastEnd = push("nap", start, dur, 5 + rnd() * 20, quality);
    }
    if (lastEnd == null) break;
    // Noche
    const bed = base + (19.5 + rnd() * 1.75) * HOUR;
    const durMin = (10.75 - ((bed - base) / HOUR - 19.5) * 0.4 + jitter(0.6)) * 60;
    const wakings: NightWaking[] = Array.from({ length: Math.floor(rnd() * 3) }, () => ({
      at: new Date(bed + (1 + rnd() * (durMin / 60 - 2)) * HOUR).toISOString(),
      durationMin: Math.round(5 + rnd() * 25),
      accompaniment: acc(),
    })).sort((a, b) => a.at.localeCompare(b.at));
    const end = push("night", bed, durMin, 10 + rnd() * 30, 4.6 - wakings.length * 0.5, wakings);
    if (end == null) break;
    morningWake = end;
  }
  return out;
}
