import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDashboard, sleepDayOf } from "./stats.ts";
import { addDays, startOfLocalDay, localParts, formatDuration } from "./time.ts";
import { demoSessions } from "./demo.ts";
import type { SleepSession } from "./types.ts";

const TZ = "Europe/Madrid";

test("startOfLocalDay maneja el cambio de hora", () => {
  // 2026-03-29: cambio a horario de verano en Madrid
  const a = startOfLocalDay("2026-03-29", TZ);
  const b = startOfLocalDay("2026-03-30", TZ);
  assert.equal((b - a) / 3_600_000, 23);
  assert.equal(localParts(a, TZ).dateKey, "2026-03-29");
  assert.equal(localParts(a, TZ).hour, 0);
});

test("la noche se atribuye al día en que termina", () => {
  const evening = Date.parse("2026-10-14T19:30:00Z"); // 21:30 Madrid
  const afterMidnight = Date.parse("2026-10-14T23:30:00Z"); // 01:30 Madrid del 15
  assert.equal(sleepDayOf("night", evening, TZ), "2026-10-15");
  assert.equal(sleepDayOf("night", afterMidnight, TZ), "2026-10-15");
  assert.equal(sleepDayOf("nap", Date.parse("2026-10-15T11:00:00Z"), TZ), "2026-10-15");
});

test("resumen de día y comparativa", () => {
  const now = new Date("2026-10-15T16:00:00Z");
  const s: SleepSession[] = [
    {
      id: "1", kind: "night", routineStart: "2026-10-14T18:40:00Z", sleepStart: "2026-10-14T19:00:00Z",
      sleepEnd: "2026-10-15T05:00:00Z", moodBefore: 3, moodAfter: 5, accompaniment: ["Pecho"], notes: null,
    },
    {
      id: "2", kind: "nap", routineStart: "2026-10-15T11:50:00Z", sleepStart: "2026-10-15T12:00:00Z",
      sleepEnd: "2026-10-15T13:30:00Z", moodBefore: 2, moodAfter: 4, accompaniment: [], notes: null,
    },
    {
      id: "3", kind: "nap", routineStart: null, sleepStart: "2026-10-15T15:30:00Z",
      sleepEnd: null, moodBefore: 3, moodAfter: null, accompaniment: [], notes: null,
    },
  ];
  const d = buildDashboard(s, { now, tz: TZ, weeks: 1 });
  assert.equal(d.today.dateKey, "2026-10-15");
  assert.equal(d.today.nightMin, 600);
  assert.equal(d.today.napMin, 90);
  assert.equal(d.today.napCount, 1);
  assert.equal(d.days.length, 7);
  assert.ok(d.inProgress);
  assert.equal(d.lastNight?.durationMin, 600);
  assert.equal(d.weekSummaries.length, 1);
  // la siesta de 12:00Z (14:00 Madrid) aparece en el grupo de las 14:00
  assert.equal(d.napStart[0].label, "14:00–15:00");
  // la noche cruza medianoche y se parte en dos días del timeline
  const t14 = d.timeline.find((t) => t.dateKey === "2026-10-14")!;
  assert.equal(t14.segments.length, 1);
  assert.equal(Math.round(t14.segments[0].startMin), 21 * 60);
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
