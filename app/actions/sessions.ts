"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import type { SleepSessionInput } from "@/lib/types";

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
  const accompaniment = [...new Set(form.getAll("accompaniment").map(String))]
    .map((a) => a.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 12);
  const notes = String(form.get("notes") ?? "").trim().slice(0, 500) || null;
  return { kind, routineStart, sleepStart, sleepEnd, moodBefore, moodAfter, accompaniment, notes };
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
