import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDashboard, sleepDayOf } from "./stats.ts";
import { addDays, startOfLocalDay, localParts, formatDuration } from "./time.ts";
import { demoSessions } from "./demo.ts";
import type { SleepSession } from "./types.ts";

const TZ = "America/Costa_Rica"; // UTC−6, sin horario de verano

test("startOfLocalDay maneja el cambio de hora", () => {
  // 2026-03-29: cambio a horario de verano en Madrid
  const a = startOfLocalDay("2026-03-29", "Europe/Madrid");
  const b = startOfLocalDay("2026-03-30", "Europe/Madrid");
  assert.equal((b - a) / 3_600_000, 23);
  assert.equal(localParts(a, "Europe/Madrid").dateKey, "2026-03-29");
  assert.equal(localParts(a, "Europe/Madrid").hour, 0);
  assert.equal(startOfLocalDay("2026-10-15", TZ), Date.parse("2026-10-15T06:00:00Z"));
});

test("la noche cuenta para el día en que empieza", () => {
  const evening = Date.parse("2026-10-15T03:30:00Z"); // 21:30 del 14 en Costa Rica
  const afterMidnight = Date.parse("2026-10-15T06:30:00Z"); // 00:30 del 15 → sigue siendo la noche del 14
  assert.equal(sleepDayOf("night", evening, TZ), "2026-10-14");
  assert.equal(sleepDayOf("night", afterMidnight, TZ), "2026-10-14");
  assert.equal(sleepDayOf("nap", Date.parse("2026-10-15T17:00:00Z"), TZ), "2026-10-15");
});

test("resumen de día y comparativa", () => {
  const now = new Date("2026-10-15T22:00:00Z"); // 16:00 del 15 en Costa Rica
  const s: SleepSession[] = [
    {
      id: "1", kind: "night", routineStart: "2026-10-14T02:40:00Z", sleepStart: "2026-10-14T03:00:00Z",
      sleepEnd: "2026-10-14T13:00:00Z", moodBefore: 3, moodAfter: 5, accompaniment: ["Pecho"], wakings: [{ at: "2026-10-14T08:00:00Z", durationMin: 20, accompaniment: ["Pecho"] }], failed: false, location: null, notes: null,
    },
    {
      id: "2", kind: "nap", routineStart: "2026-10-15T17:50:00Z", sleepStart: "2026-10-15T18:00:00Z",
      sleepEnd: "2026-10-15T19:30:00Z", moodBefore: 2, moodAfter: 4, accompaniment: [], wakings: [], failed: false, location: null, notes: null,
    },
    {
      id: "3", kind: "nap", routineStart: null, sleepStart: "2026-10-15T21:30:00Z",
      sleepEnd: null, moodBefore: 3, moodAfter: null, accompaniment: [], wakings: [], failed: false, location: null, notes: null,
    },
  ];
  const d = buildDashboard(s, { now, tz: TZ, weeks: 1 });
  assert.equal(d.today.dateKey, "2026-10-15");
  assert.equal(d.today.napMin, 90);
  assert.equal(d.today.napCount, 1);
  assert.equal(d.today.nightMin, 0);
  // la noche del 13 (21:00 → 07:00 del 14) cuenta para el día 13
  const d13 = d.days.find((x) => x.dateKey === "2026-10-13")!;
  // 600 min en cama − 20 min de despertar nocturno
  assert.equal(d13.nightMin, 580);
  assert.equal(d13.wakings, 1);
  assert.equal(d.days.find((x) => x.dateKey === "2026-10-14")!.totalMin, 0);
  assert.equal(d.days.length, 7);
  assert.ok(d.inProgress);
  assert.equal(d.lastNight?.durationMin, 580);
  assert.equal(d.lastNight?.wakings, 1);
  assert.equal(d.weekSummaries.length, 1);
  assert.equal(d.napStart[0].label, "12:00–13:00");
  // la noche cruza medianoche y se parte en dos días del timeline
  const t13 = d.timeline.find((t) => t.dateKey === "2026-10-13")!;
  assert.equal(t13.segments.length, 1);
  assert.equal(t13.segments[0].wakings.length, 0); // el despertar (02:00) cae en el día 14
  assert.equal(d.timeline.find((t) => t.dateKey === "2026-10-14")!.segments[0].wakings.length, 1);
  assert.equal(Math.round(t13.segments[0].startMin), 21 * 60);
});

test("dashboard con datos demo genera tendencias e insights", () => {
  const now = new Date("2026-10-16T18:00:00Z");
  const d = buildDashboard(demoSessions(TZ, now), { now, tz: TZ, weeks: 4 });
  assert.equal(d.days.length, 28);
  assert.equal(d.weekSummaries.length, 4);
  assert.equal(d.weekSummaries[3].label, "Últimos 7 días");
  assert.ok(d.insights.length >= 4, `insights: ${d.insights.map((i) => i.id)}`);
  assert.ok(d.bedtime.some((b) => b.best));
  assert.ok(d.baseline.totalMin! > 600);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(formatDuration(605), "10 h 05");
});

test("referencias: ventanas de vigilia, siestas tardías y próxima siesta", () => {
  const night = (start: string, end: string): SleepSession => ({
    id: start, kind: "night", routineStart: null, sleepStart: start, sleepEnd: end,
    moodBefore: 3, moodAfter: 4, accompaniment: [], wakings: [], failed: false, location: null, notes: null,
  });
  const nap = (start: string, end: string | null): SleepSession => ({
    id: start, kind: "nap", routineStart: null, sleepStart: start, sleepEnd: end,
    moodBefore: 3, moodAfter: end ? 4 : null, accompaniment: [], wakings: [], failed: false, location: null, notes: null,
  });
  // Costa Rica = UTC−6. Día 15: despierta 05:30 (temprano), siestas 07:30–08:30, 11:15–12:45, 17:30–18:00 (tardía)
  const s = [
    night("2026-10-15T02:00:00Z", "2026-10-15T11:30:00Z"),
    nap("2026-10-15T13:30:00Z", "2026-10-15T14:30:00Z"),
    nap("2026-10-15T17:15:00Z", "2026-10-15T18:45:00Z"),
    nap("2026-10-15T23:30:00Z", "2026-10-16T00:00:00Z"),
  ];
  const d = buildDashboard(s, { now: new Date("2026-10-16T02:00:00Z"), tz: TZ, weeks: 1 });
  const ww = d.references.wakeWindows;
  assert.equal(ww[0].avgMin, 120); // 05:30 → 07:30
  assert.equal(ww[0].ok, 1);
  assert.equal(ww[1].avgMin, 165); // 08:30 → 11:15 (objetivo 150, tolerancia 15)
  assert.equal(ww[1].ok, 1);
  assert.equal(ww[2].avgMin, 285);
  assert.equal(ww[2].long, 1);
  assert.equal(d.references.lateNaps.count, 1);
  assert.equal(d.references.earlyWakes.count, 1);
  assert.equal(d.references.earlyWakes.earliest, 5 * 60 + 30);

  // Próxima siesta: tras la 1ª siesta (termina 08:30) toca a las 11:00
  const partial = s.slice(0, 2);
  const d2 = buildDashboard(partial, { now: new Date("2026-10-15T15:00:00Z"), tz: TZ, weeks: 1 });
  assert.deepEqual(
    { i: d2.nextNap?.index, at: d2.nextNap?.atMin, st: d2.nextNap?.status },
    { i: 1, at: 11 * 60, st: "suggested" },
  );
  // Con una siesta en curso no se sugiere nada
  const d3 = buildDashboard([...partial, nap("2026-10-15T17:00:00Z", null)], { now: new Date("2026-10-15T17:30:00Z"), tz: TZ, weeks: 1 });
  assert.equal(d3.nextNap, null);
});
