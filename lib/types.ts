export type SleepKind = "nap" | "night";

export interface NightWaking {
  /** ISO 8601 */
  at: string;
  /** duración aproximada en minutos */
  durationMin: number;
  accompaniment: string[];
}

export interface SleepSession {
  id: string;
  kind: SleepKind;
  /** ISO 8601 instants */
  routineStart: string | null;
  sleepStart: string;
  sleepEnd: string | null;
  moodBefore: number | null;
  moodAfter: number | null;
  accompaniment: string[];
  /** Solo en sueño nocturno */
  wakings: NightWaking[];
  notes: string | null;
}

export type SleepSessionInput = Omit<SleepSession, "id">;

export const KIND_LABEL: Record<SleepKind, string> = {
  nap: "Siesta",
  night: "Noche",
};

export const MOODS = [
  { value: 1, label: "Muy mal" },
  { value: 2, label: "Mal" },
  { value: 3, label: "Normal" },
  { value: 4, label: "Bien" },
  { value: 5, label: "Genial" },
] as const;

export function moodLabel(value: number | null | undefined): string {
  return MOODS.find((m) => m.value === value)?.label ?? "—";
}

export const NO_ACCOMPANIMENT = "Solo/a";

export const ACCOMPANIMENT_OPTIONS = [
  NO_ACCOMPANIMENT,
  "En brazos",
  "Cama",
  "Mano encima",
  "Pecho",
  "Biberón",
  "Mecido",
  "Cochecito",
  "Coche",
  "Colecho",
  "Chupete",
  "Ruido blanco",
  "Canción / cuento",
] as const;
