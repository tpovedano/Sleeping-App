export type SleepKind = "nap" | "night";

/** Despertar durante un sueño (noche o siesta) */
export interface Waking {
  /** ISO 8601 */
  at: string;
  /** duración aproximada en minutos */
  durationMin: number;
  /** ayuda para volver a dormirse, varias posibles ("Solo/a" = se volvió a dormir sin ayuda) */
  accompaniment: string[];
  /** hubo toma de leche */
  milk: boolean;
  /**
   * Último despertar tras el que no volvió a dormirse (noche o siesta):
   * dura hasta la hora de despertar (salida del cuarto).
   */
  final: boolean;
}

export interface SleepSession {
  id: string;
  kind: SleepKind;
  /** Siesta fallida: no llegó a dormirse. sleepStart/sleepEnd = inicio y fin del intento. */
  failed: boolean;
  /** ISO 8601 instants; null = no hubo rutina */
  routineStart: string | null;
  sleepStart: string;
  sleepEnd: string | null;
  moodBefore: number | null;
  moodAfter: number | null;
  accompaniment: string[];
  /** Dónde durmió */
  location: string | null;
  wakings: Waking[];
  /** Noche: hora del «despertar dramático» (se abren las cortinas y empieza el día). Opcional. */
  dramaticWake: string | null;
  /**
   * Siesta: fin de la siesta cuando ya estaba despierta/o (p. ej. se queda en la cuna y luego se sale).
   * Opcional. La siguiente ventana de vigilia se cuenta desde aquí.
   */
  napEnd: string | null;
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
  "Mano encima",
  "Pecho",
  "Biberón",
  "Mecido",
  "Chupete",
  "Ruido blanco",
  "Canción / cuento",
] as const;

export const LOCATION_OPTIONS = ["Cama", "Colecho", "Cochecito", "Carro", "Casa abuelos"] as const;

/** Etiquetas que antes estaban en «acompañamiento» y ahora son «dónde durmió» */
export const LEGACY_LOCATION_TAGS: Record<string, string> = {
  Cama: "Cama",
  Colecho: "Colecho",
  Cochecito: "Cochecito",
  Coche: "Carro",
};

/** ¿Necesitó ayuda para volver a dormirse en este despertar? */
export const neededHelp = (w: Waking) => w.accompaniment.some((a) => a !== NO_ACCOMPANIMENT);
