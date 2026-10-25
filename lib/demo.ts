import type { Waking, SleepSession } from "./types.ts";
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
  const acc = () => [pick(["Solo/a", "En brazos", "Pecho", "Mecido", "Chupete", "Mano encima"])];
  const help = () => [pick(["Solo/a", "Solo/a", "Mano encima", "Pecho", "En brazos"])];

  const push = (
    kind: "nap" | "night",
    startMs: number,
    durMin: number,
    routineMin: number,
    quality: number,
    wakings: Waking[] = [],
  ): number | null => {
    if (startMs > nowMs) return null;
    // A veces la siesta no sale: intento fallido y nuevo intento 20-40 min después
    if (kind === "nap" && rnd() < 0.08 && startMs + 30 * MINUTE < nowMs) {
      out.push({
        id: `demo-${++id}`,
        kind,
        failed: true,
        routineStart: null,
        sleepStart: new Date(startMs).toISOString(),
        sleepEnd: new Date(startMs + 20 * MINUTE).toISOString(),
        moodBefore: 2,
        moodAfter: 2,
        accompaniment: acc(),
        location: "Cama",
        wakings: [],
        notes: null,
      });
      startMs += (20 + 10 + rnd() * 20) * MINUTE;
      if (startMs > nowMs) return null;
    }
    const end = startMs + durMin * MINUTE;
    const done = end <= nowMs;
    if (kind === "nap" && rnd() < 0.35) {
      wakings = [{ at: new Date(startMs + durMin * 0.5 * MINUTE).toISOString(), durationMin: Math.round(3 + rnd() * 10), accompaniment: help(), milk: rnd() < 0.2 }];
    }
    out.push({
      id: `demo-${++id}`,
      kind,
      failed: false,
      location: kind === "night" ? pick(["Cama", "Cama", "Colecho"]) : pick(["Cama", "Cama", "Cochecito", "Carro", "Casa abuelos"]),
      routineStart: rnd() < 0.1 ? null : new Date(startMs - routineMin * MINUTE).toISOString(),
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
    const wakings: Waking[] = Array.from({ length: Math.floor(rnd() * 3) }, () => ({
      at: new Date(bed + (1 + rnd() * (durMin / 60 - 2)) * HOUR).toISOString(),
      durationMin: Math.round(5 + rnd() * 25),
      accompaniment: rnd() < 0.4 ? [...new Set([...acc(), ...acc()])].filter((t, _, all) => t !== "Solo/a" || all.length === 1) : acc(),
      milk: rnd() < 0.5,
    })).sort((a, b) => a.at.localeCompare(b.at));
    const end = push("night", bed, durMin, 10 + rnd() * 30, 4.6 - wakings.length * 0.5, wakings);
    if (end == null) break;
    morningWake = end;
  }
  return out;
}
