import type { SleepSession } from "./types.ts";

const HOUR = 3_600_000;

/**
 * Una siesta (o intento de siesta) solo se puede registrar si la noche anterior está completa:
 * existe, tiene hora de despertar y terminó antes de que empezara la siesta.
 * Devuelve el mensaje de error o null si es válida.
 */
export function napNeedsCompletedNight(
  sessions: SleepSession[],
  napStartIso: string,
  editingId?: string | null,
): string | null {
  const napStart = Date.parse(napStartIso);
  let last: SleepSession | null = null;
  for (const s of sessions) {
    if (s.kind !== "night" || s.id === editingId) continue;
    const start = Date.parse(s.sleepStart);
    if (start >= napStart) continue;
    if (!last || start > Date.parse(last.sleepStart)) last = s;
  }
  if (!last) return "Primero registra la noche anterior (con su hora de despertar) y después las siestas.";
  if (!last.sleepEnd) return "La noche sigue en curso: registra a qué hora se despertó antes de añadir una siesta.";
  const end = Date.parse(last.sleepEnd);
  if (end > napStart) return "La siesta empieza antes de que terminara la noche: revisa las horas.";
  if (napStart - end > 20 * HOUR) return "Falta registrar la noche anterior a esta siesta (con su hora de despertar).";
  return null;
}

/** Noche en curso (sin hora de despertar) que impide registrar siestas. */
export function openNight(sessions: SleepSession[], now = Date.now()): SleepSession | null {
  return (
    sessions.find((s) => s.kind === "night" && !s.sleepEnd && now - Date.parse(s.sleepStart) < 24 * HOUR) ?? null
  );
}
