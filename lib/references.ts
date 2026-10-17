/**
 * Parámetros de referencia contra los que se comparan las estadísticas.
 * En esta PoC son fijos; más adelante serán editables por cada usuario.
 */
export interface SleepReferences {
  /** Tiempo total de siestas al día (minutos) */
  napTotalMin: { min: number; max: number };
  /**
   * Ventanas de vigilia objetivo (minutos), en orden:
   * despertar de la mañana → 1ª siesta, 1ª → 2ª, 2ª → 3ª, 3ª → 4ª
   */
  wakeWindowsMin: number[];
  /** Ninguna siesta debería empezar después de esta hora (minuto del día) */
  latestNapStart: number;
  /** No levantarse antes de esta hora (minuto del día) */
  earliestMorningWake: number;
  /** Margen de tolerancia para considerar una ventana "en objetivo" (minutos) */
  wakeWindowToleranceMin: number;
}

export const DEFAULT_REFERENCES: SleepReferences = {
  napTotalMin: { min: 120, max: 180 },
  wakeWindowsMin: [120, 150, 150, 120],
  latestNapStart: 17 * 60,
  earliestMorningWake: 6 * 60,
  wakeWindowToleranceMin: 15,
};

export const WAKE_WINDOW_LABELS = [
  "Despertar → 1ª siesta",
  "1ª siesta → 2ª siesta",
  "2ª siesta → 3ª siesta",
  "3ª siesta → 4ª siesta",
];

/** Punto único de lectura: cuando haya usuarios, se cargarán de la base de datos. */
export function getReferences(): SleepReferences {
  return DEFAULT_REFERENCES;
}
