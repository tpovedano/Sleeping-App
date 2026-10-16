import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { SleepSession, SleepSessionInput } from "./types";
import { demoSessions } from "./demo";
import { appTimezone } from "./config";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sleep_sessions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind           text NOT NULL CHECK (kind IN ('nap', 'night')),
    routine_start  timestamptz,
    sleep_start    timestamptz NOT NULL,
    sleep_end      timestamptz,
    mood_before    smallint CHECK (mood_before BETWEEN 1 AND 5),
    mood_after     smallint CHECK (mood_after BETWEEN 1 AND 5),
    accompaniment  text[] NOT NULL DEFAULT '{}',
    notes          text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CHECK (sleep_end IS NULL OR sleep_end > sleep_start),
    CHECK (routine_start IS NULL OR routine_start <= sleep_start)
  )`,
  `CREATE INDEX IF NOT EXISTS sleep_sessions_sleep_start_idx ON sleep_sessions (sleep_start DESC)`,
];

interface Store {
  list(since?: Date): Promise<SleepSession[]>;
  get(id: string): Promise<SleepSession | null>;
  create(input: SleepSessionInput): Promise<SleepSession>;
  update(id: string, input: SleepSessionInput): Promise<void>;
  remove(id: string): Promise<void>;
}

type Row = {
  id: string;
  kind: "nap" | "night";
  routine_start: string | Date | null;
  sleep_start: string | Date;
  sleep_end: string | Date | null;
  mood_before: number | null;
  mood_after: number | null;
  accompaniment: string[] | null;
  notes: string | null;
};

const iso = (v: string | Date | null) => (v == null ? null : new Date(v).toISOString());

function fromRow(r: Row): SleepSession {
  return {
    id: r.id,
    kind: r.kind,
    routineStart: iso(r.routine_start),
    sleepStart: iso(r.sleep_start)!,
    sleepEnd: iso(r.sleep_end),
    moodBefore: r.mood_before,
    moodAfter: r.mood_after,
    accompaniment: r.accompaniment ?? [],
    notes: r.notes,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function neonStore(url: string): Store {
  const sql: NeonQueryFunction<false, false> = neon(url);
  let ready: Promise<unknown> | null = null;
  const ensure = () => {
    ready ??= (async () => {
      for (const stmt of SCHEMA) await sql.query(stmt);
    })().catch((e) => {
      ready = null;
      throw e;
    });
    return ready;
  };
  return {
    async list(since) {
      await ensure();
      const rows = since
        ? await sql`SELECT * FROM sleep_sessions WHERE sleep_start >= ${since.toISOString()} ORDER BY sleep_start DESC`
        : await sql`SELECT * FROM sleep_sessions ORDER BY sleep_start DESC LIMIT 500`;
      return (rows as Row[]).map(fromRow);
    },
    async get(id) {
      if (!UUID.test(id)) return null;
      await ensure();
      const rows = (await sql`SELECT * FROM sleep_sessions WHERE id = ${id}`) as Row[];
      return rows[0] ? fromRow(rows[0]) : null;
    },
    async create(i) {
      await ensure();
      const rows = (await sql`
        INSERT INTO sleep_sessions (kind, routine_start, sleep_start, sleep_end, mood_before, mood_after, accompaniment, notes)
        VALUES (${i.kind}, ${i.routineStart}, ${i.sleepStart}, ${i.sleepEnd}, ${i.moodBefore}, ${i.moodAfter}, ${i.accompaniment}, ${i.notes})
        RETURNING *`) as Row[];
      return fromRow(rows[0]);
    },
    async update(id, i) {
      if (!UUID.test(id)) return;
      await ensure();
      await sql`
        UPDATE sleep_sessions SET
          kind = ${i.kind}, routine_start = ${i.routineStart}, sleep_start = ${i.sleepStart},
          sleep_end = ${i.sleepEnd}, mood_before = ${i.moodBefore}, mood_after = ${i.moodAfter},
          accompaniment = ${i.accompaniment}, notes = ${i.notes}, updated_at = now()
        WHERE id = ${id}`;
    },
    async remove(id) {
      if (!UUID.test(id)) return;
      await ensure();
      await sql`DELETE FROM sleep_sessions WHERE id = ${id}`;
    },
  };
}

/** Almacén en memoria con datos de ejemplo: solo para desarrollo local sin DATABASE_URL. */
function memoryStore(): Store {
  const g = globalThis as unknown as { __sleepMemory?: SleepSession[] };
  g.__sleepMemory ??= demoSessions(appTimezone());
  const data = g.__sleepMemory;
  const sorted = () => [...data].sort((a, b) => b.sleepStart.localeCompare(a.sleepStart));
  return {
    async list(since) {
      return sorted().filter((s) => !since || Date.parse(s.sleepStart) >= since.getTime());
    },
    async get(id) {
      return data.find((s) => s.id === id) ?? null;
    },
    async create(i) {
      const s = { ...i, id: crypto.randomUUID() };
      data.push(s);
      return s;
    },
    async update(id, i) {
      const idx = data.findIndex((s) => s.id === id);
      if (idx >= 0) data[idx] = { ...i, id };
    },
    async remove(id) {
      const idx = data.findIndex((s) => s.id === id);
      if (idx >= 0) data.splice(idx, 1);
    },
  };
}

let store: Store | null = null;

export function db(): Store {
  if (store) return store;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) store = neonStore(url);
  else if (process.env.NODE_ENV !== "production") store = memoryStore();
  else throw new Error("Falta la variable de entorno DATABASE_URL (conecta Neon desde Vercel → Storage).");
  return store;
}

export const isDemoStore = () => !(process.env.DATABASE_URL || process.env.POSTGRES_URL);
