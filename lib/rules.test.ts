import { test } from "node:test";
import assert from "node:assert/strict";
import { napNeedsCompletedNight, openNight } from "./rules.ts";
import { buildDashboard } from "./stats.ts";
import { shouldRenew, SESSION_MAX_AGE } from "./auth.ts";
import type { SleepSession } from "./types.ts";

const TZ = "America/Costa_Rica";
const base = {
  failed: false, routineStart: null, moodBefore: 3, moodAfter: 4, accompaniment: [], location: null,
  wakings: [], dramaticWake: null, notes: null,
} satisfies Partial<SleepSession>;
const night = (id: string, start: string, end: string | null): SleepSession => ({ ...base, id, kind: "night", sleepStart: start, sleepEnd: end });
const nap = (id: string, start: string, end: string | null, extra: Partial<SleepSession> = {}): SleepSession => ({
  ...base, id, kind: "nap", sleepStart: start, sleepEnd: end, ...extra,
});

test("no se puede registrar siesta sin noche completa", () => {
  const n = night("n1", "2026-10-15T02:00:00Z", "2026-10-15T12:00:00Z"); // 20:00 → 06:00 CR
  assert.match(napNeedsCompletedNight([], "2026-10-15T14:00:00Z")!, /Primero registra la noche/);
  assert.match(napNeedsCompletedNight([night("n1", "2026-10-15T02:00:00Z", null)], "2026-10-15T14:00:00Z")!, /sigue en curso/);
  assert.match(napNeedsCompletedNight([n], "2026-10-15T11:00:00Z")!, /antes de que terminara/);
  assert.equal(napNeedsCompletedNight([n], "2026-10-15T14:00:00Z"), null);
  // dos días después sin registrar la noche intermedia
  assert.match(napNeedsCompletedNight([n], "2026-10-16T16:00:00Z")!, /Falta registrar la noche/);
  assert.equal(openNight([night("n2", "2026-10-15T02:00:00Z", null)], Date.parse("2026-10-15T10:00:00Z"))?.id, "n2");
});

test("siestas fallidas, despertares en siesta y sin rutina", () => {
  const s: SleepSession[] = [
    night("n1", "2026-10-15T02:00:00Z", "2026-10-15T12:00:00Z"),
    // intento fallido 08:00–08:20, luego siesta 08:40–09:40 con un despertar que necesitó ayuda
    nap("f1", "2026-10-15T14:00:00Z", "2026-10-15T14:20:00Z", { failed: true }),
    nap("a", "2026-10-15T14:40:00Z", "2026-10-15T15:40:00Z", {
      wakings: [{ at: "2026-10-15T15:00:00Z", durationMin: 10, accompaniment: ["Mano encima"], milk: false, final: false }],
      location: "Carro",
    }),
    // siesta de corrido sin rutina
    nap("b", "2026-10-15T18:00:00Z", "2026-10-15T19:00:00Z", { location: "Cama" }),
  ];
  const d = buildDashboard(s, { now: new Date("2026-10-15T23:00:00Z"), tz: TZ, weeks: 1 });
  assert.equal(d.today.napCount, 2);
  assert.equal(d.today.napMin, 110); // 50 (60 − 10 despierto) + 60
  assert.equal(d.today.failedNaps, 1);
  assert.deepEqual(d.napQuality, { naps: 2, uninterrupted: 1, selfSettled: 0, neededHelp: 1, failed: 1 });
  // la ventana de vigilia se mide hasta la siesta que sí salió (06:00 → 08:40)
  assert.equal(d.references.wakeWindows[0].avgMin, 160);
  assert.ok(d.routine.some((b) => b.key === "none" && b.count === 3));
  assert.deepEqual(d.location.map((b) => b.key).sort(), ["Cama", "Carro"]);
  const seg = d.timeline.find((t) => t.dateKey === "2026-10-15")!.segments;
  assert.equal(seg.filter((x) => x.failed).length, 1);
  assert.equal(seg.find((x) => x.wakings.length)?.wakings.length, 1);
});

test("la sesión se renueva pasado un día", () => {
  const now = Math.floor(Date.now() / 1000);
  assert.equal(shouldRenew(`v1.${now + SESSION_MAX_AGE}.x`), false);
  assert.equal(shouldRenew(`v1.${now + SESSION_MAX_AGE - 2 * 86400}.x`), true);
  assert.equal(shouldRenew(undefined), false);
});

test("noche sin volver a dormirse y despertar dramático", () => {
  // 20:00 → sale del cuarto 06:00 (CR); último despertar 05:00 sin volver a dormirse; cortinas 06:30
  const n: SleepSession = {
    ...night("n1", "2026-10-15T02:00:00Z", "2026-10-15T12:00:00Z"),
    wakings: [{ at: "2026-10-15T11:00:00Z", durationMin: 60, accompaniment: ["Mano encima"], milk: true, final: true }],
    dramaticWake: "2026-10-15T12:30:00Z",
  };
  const d = buildDashboard([n], { now: new Date("2026-10-16T00:00:00Z"), tz: TZ, weeks: 1 });
  const d14 = d.days.find((x) => x.dateKey === "2026-10-14")!;
  assert.equal(d14.nightMin, 540); // 10 h en cama − 1 h despierto/a
  assert.equal(d.lastNight?.awakeFrom, 5 * 60);
  assert.equal(d.lastNight?.dramaticWake, 6 * 60 + 30);
  assert.equal(d.baseline.endedAwakeNights, 1);
  assert.equal(d.baseline.dramaticWake, 6 * 60 + 30);
});
