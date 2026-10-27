"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { napNeedsCompletedNight } from "@/lib/rules";
import type { SleepSessionInput, Waking } from "@/lib/types";

export type SaveState = { error?: string; ok?: boolean; savedAt?: number; failed?: boolean };

const HOUR = 3_600_000;

function parseInstant(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function parseMood(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

function cleanTags(values: unknown[]): string[] {
  return [...new Set(values.filter((v): v is string => typeof v === "string"))]
    .map((a) => a.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 12);
}

function parseWakings(raw: FormDataEntryValue | null, start: number, end: number | null): Waking[] | string {
  if (typeof raw !== "string" || !raw) return [];
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return "No se pudieron leer los despertares.";
  }
  if (!Array.isArray(list)) return [];
  const out: Waking[] = [];
  for (const w of list.slice(0, 20)) {
    const at = parseInstant(typeof w?.at === "string" ? w.at : null);
    if (!at) return "Indica la hora de cada despertar.";
    const t = Date.parse(at);
    if (t < start || (end != null && t > end)) return "Cada despertar debe estar entre la hora de dormirse y la de despertar.";
    const final = w?.final === true;
    let durationMin: number;
    if (final) {
      if (end == null) return "Para marcar que no volvió a dormirse, indica la hora en que salió del cuarto.";
      // dura hasta la salida del cuarto
      durationMin = Math.round((end - t) / 60_000);
      if (durationMin < 1) return "La hora de salir del cuarto debe ser posterior al último despertar.";
    } else {
      durationMin = Math.round(Number(w?.durationMin));
      if (!Number.isFinite(durationMin) || durationMin < 1 || durationMin > 240)
        return "La duración de cada despertar debe estar entre 1 y 240 minutos.";
    }
    out.push({
      at,
      durationMin,
      accompaniment: cleanTags(Array.isArray(w?.accompaniment) ? w.accompaniment : []),
      milk: w?.milk === true,
      final,
    });
  }
  out.sort((a, b) => a.at.localeCompare(b.at));
  if (out.slice(0, -1).some((w) => w.final))
    return "Solo el último despertar puede marcarse como «no volvió a dormirse».";
  return out;
}

function parse(form: FormData): SleepSessionInput | string {
  const kind = form.get("kind");
  if (kind !== "nap" && kind !== "night") return "Elige si es siesta o noche.";
  const failed = kind === "nap" && form.get("failed") === "1";
  const noRoutine = form.get("noRoutine") === "1";
  const routineStart = noRoutine ? null : parseInstant(form.get("routineStart"));
  const sleepStart = parseInstant(form.get("sleepStart"));
  const sleepEnd = parseInstant(form.get("sleepEnd"));
  if (!noRoutine && !routineStart) return "Indica a qué hora empezó la rutina o marca «Sin rutina».";
  if (!sleepStart) return failed ? "Indica a qué hora empezó el intento." : "Indica a qué hora se quedó dormido/a.";
  if (failed && !sleepEnd) return "Indica a qué hora se dio por terminado el intento.";
  const s = Date.parse(sleepStart);
  if (routineStart) {
    const r = Date.parse(routineStart);
    if (r > s) return "La rutina no puede empezar después de quedarse dormido/a.";
    if (s - r > 6 * HOUR) return "La rutina dura más de 6 horas: revisa las horas.";
  }
  if (sleepEnd) {
    const e = Date.parse(sleepEnd);
    if (e <= s) return failed ? "El fin del intento debe ser posterior a su inicio." : "La hora de despertar debe ser posterior a la de dormirse.";
    if (e - s > 20 * HOUR) return "El sueño dura más de 20 horas: revisa las horas.";
  }
  if (s > Date.now() + 5 * 60_000) return "La hora de inicio está en el futuro.";
  const moodBefore = parseMood(form.get("moodBefore"));
  if (!moodBefore) return "Selecciona el estado de ánimo antes de dormir.";
  const moodAfter = sleepEnd ? parseMood(form.get("moodAfter")) : null;
  if (sleepEnd && !moodAfter) return failed ? "Selecciona el estado de ánimo al terminar el intento." : "Selecciona el estado de ánimo al despertar.";
  const accompaniment = cleanTags(form.getAll("accompaniment"));
  const location = String(form.get("location") ?? "").trim().slice(0, 40) || null;
  const wakings = failed ? [] : parseWakings(form.get("wakings"), s, sleepEnd ? Date.parse(sleepEnd) : null);
  if (typeof wakings === "string") return wakings;
  if (kind !== "night" && wakings.some((w) => w.final)) return "«No volvió a dormirse» solo aplica a la noche.";
  const dramaticWake = kind === "night" ? parseInstant(form.get("dramaticWake")) : null;
  if (dramaticWake) {
    const d = Date.parse(dramaticWake);
    if (d < s) return "El despertar dramático debe ser posterior a la hora de dormirse.";
    if (sleepEnd && d > Date.parse(sleepEnd) + 4 * HOUR) return "El despertar dramático está muy lejos de la hora de despertar: revisa la hora.";
  }
  const notes = String(form.get("notes") ?? "").trim().slice(0, 1000) || null;
  return {
    kind,
    failed,
    routineStart,
    sleepStart,
    sleepEnd,
    moodBefore,
    moodAfter,
    accompaniment,
    location,
    wakings,
    dramaticWake,
    notes,
  };
}

export async function saveSession(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireAuth();
  const input = parse(form);
  if (typeof input === "string") return { error: input };
  const id = String(form.get("id") ?? "");
  try {
    if (input.kind === "nap") {
      const around = await db().list(new Date(Date.parse(input.sleepStart) - 48 * HOUR));
      const err = napNeedsCompletedNight(around, input.sleepStart, id || null);
      if (err) return { error: err };
    }
    if (id) await db().update(id, input);
    else await db().create(input);
  } catch (e) {
    console.error(e);
    return { error: "No se pudo guardar el registro. Revisa la conexión con la base de datos." };
  }
  revalidatePath("/registro");
  revalidatePath("/estadisticas");
  if (id) redirect("/registro");
  return { ok: true, savedAt: Date.now(), failed: input.failed };
}

export async function deleteSession(form: FormData) {
  await requireAuth();
  const id = String(form.get("id") ?? "");
  if (id) await db().remove(id);
  revalidatePath("/registro");
  revalidatePath("/estadisticas");
}
