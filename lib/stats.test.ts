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
      sleepEnd: "2026-10-14T13:00:00Z", moodBefore: 3, moodAfter: 5, accompaniment: ["Pecho"], notes: null,
    },
    {
      id: "2", kind: "nap", routineStart: "2026-10-15T17:50:00Z", sleepStart: "2026-10-15T18:00:00Z",
      sleepEnd: "2026-10-15T19:30:00Z", moodBefore: 2, moodAfter: 4, accompaniment: [], notes: null,
    },
    {
      id: "3", kind: "nap", routineStart: null, sleepStart: "2026-10-15T21:30:00Z",
      sleepEnd: null, moodBefore: 3, moodAfter: null, accompaniment: [], notes: null,
    },
  ];
  const d = buildDashboard(s, { now, tz: TZ, weeks: 1 });
  assert.equal(d.today.dateKey, "2026-10-15");
  assert.equal(d.today.napMin, 90);
  assert.equal(d.today.napCount, 1);
  assert.equal(d.today.nightMin, 0);
  // la noche del 13 (21:00 → 07:00 del 14) cuenta para el día 13
  const d13 = d.days.find((x) => x.dateKey === "2026-10-13")!;
  assert.equal(d13.nightMin, 600);
  assert.equal(d.days.find((x) => x.dateKey === "2026-10-14")!.totalMin, 0);
  assert.equal(d.days.length, 7);
  assert.ok(d.inProgress);
  assert.equal(d.lastNight?.durationMin, 600);
  assert.equal(d.weekSummaries.length, 1);
  assert.equal(d.napStart[0].label, "12:00–13:00");
  // la noche cruza medianoche y se parte en dos días del timeline
  const t13 = d.timeline.find((t) => t.dateKey === "2026-10-13")!;
  assert.equal(t13.segments.length, 1);
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
