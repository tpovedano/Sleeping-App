"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import type { NightWaking, SleepSessionInput } from "@/lib/types";

export type SaveState = { error?: string; ok?: boolean; savedAt?: number };

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

function parseWakings(raw: FormDataEntryValue | null, start: number, end: number | null): NightWaking[] | string {
  if (typeof raw !== "string" || !raw) return [];
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return "No se pudieron leer los despertares nocturnos.";
  }
  if (!Array.isArray(list)) return [];
  const out: NightWaking[] = [];
  for (const w of list.slice(0, 20)) {
    const at = parseInstant(typeof w?.at === "string" ? w.at : null);
    if (!at) return "Indica la hora de cada despertar nocturno.";
    const t = Date.parse(at);
    if (t < start || (end != null && t > end)) return "Cada despertar debe estar entre la hora de dormirse y la de despertar.";
    const durationMin = Math.round(Number(w?.durationMin));
    if (!Number.isFinite(durationMin) || durationMin < 1 || durationMin > 240)
      return "La duración de cada despertar debe estar entre 1 y 240 minutos.";
    out.push({ at, durationMin, accompaniment: cleanTags(Array.isArray(w?.accompaniment) ? w.accompaniment : []) });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

function parse(form: FormData): SleepSessionInput | string {
  const kind = form.get("kind");
  if (kind !== "nap" && kind !== "night") return "Elige si es siesta o noche.";
  const routineStart = parseInstant(form.get("routineStart"));
  const sleepStart = parseInstant(form.get("sleepStart"));
  const sleepEnd = parseInstant(form.get("sleepEnd"));
  if (!routineStart) return "Indica a qué hora empezó la rutina de sueño.";
  if (!sleepStart) return "Indica a qué hora se quedó dormido/a.";
  const s = Date.parse(sleepStart);
  const r = Date.parse(routineStart);
  if (r > s) return "La rutina no puede empezar después de quedarse dormido/a.";
  if (s - r > 6 * HOUR) return "La rutina dura más de 6 horas: revisa las horas.";
  if (sleepEnd) {
    const e = Date.parse(sleepEnd);
    if (e <= s) return "La hora de despertar debe ser posterior a la de dormirse.";
    if (e - s > 20 * HOUR) return "El sueño dura más de 20 horas: revisa las horas.";
  }
  if (s > Date.now() + 5 * 60_000) return "La hora de dormirse está en el futuro.";
  const moodBefore = parseMood(form.get("moodBefore"));
  if (!moodBefore) return "Selecciona el estado de ánimo antes de dormir.";
  const moodAfter = sleepEnd ? parseMood(form.get("moodAfter")) : null;
  if (sleepEnd && !moodAfter) return "Selecciona el estado de ánimo al despertar.";
  const accompaniment = cleanTags(form.getAll("accompaniment"));
  const wakings = kind === "night" ? parseWakings(form.get("wakings"), s, sleepEnd ? Date.parse(sleepEnd) : null) : [];
  if (typeof wakings === "string") return wakings;
  const notes = String(form.get("notes") ?? "").trim().slice(0, 500) || null;
  return { kind, routineStart, sleepStart, sleepEnd, moodBefore, moodAfter, accompaniment, wakings, notes };
}

export async function saveSession(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireAuth();
  const input = parse(form);
  if (typeof input === "string") return { error: input };
  const id = String(form.get("id") ?? "");
  try {
    if (id) await db().update(id, input);
    else await db().create(input);
  } catch (e) {
    console.error(e);
    return { error: "No se pudo guardar el registro. Revisa la conexión con la base de datos." };
  }
  revalidatePath("/registro");
  revalidatePath("/estadisticas");
  if (id) redirect("/registro");
  return { ok: true, savedAt: Date.now() };
}

export async function deleteSession(form: FormData) {
  await requireAuth();
  const id = String(form.get("id") ?? "");
  if (id) await db().remove(id);
  revalidatePath("/registro");
  revalidatePath("/estadisticas");
}
