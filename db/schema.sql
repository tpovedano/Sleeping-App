CREATE TABLE IF NOT EXISTS sleep_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           text NOT NULL CHECK (kind IN ('nap', 'night')),
  routine_start  timestamptz,
  sleep_start    timestamptz NOT NULL,
  sleep_end      timestamptz,
  mood_before    smallint CHECK (mood_before BETWEEN 1 AND 5),
  mood_after     smallint CHECK (mood_after BETWEEN 1 AND 5),
  accompaniment  text[] NOT NULL DEFAULT '{}',
  night_wakings  jsonb NOT NULL DEFAULT '[]'::jsonb, -- despertares (noche o siesta): [{ at, durationMin, accompaniment[] }]
  location       text,                               -- dónde durmió
  failed         boolean NOT NULL DEFAULT false,     -- siesta fallida (no se durmió)
  dramatic_wake  timestamptz,                        -- noche: «despertar dramático» (opcional)
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (sleep_end IS NULL OR sleep_end > sleep_start),
  CHECK (routine_start IS NULL OR routine_start <= sleep_start)
);

CREATE INDEX IF NOT EXISTS sleep_sessions_sleep_start_idx ON sleep_sessions (sleep_start DESC);

-- Migraciones para bases creadas con versiones anteriores
ALTER TABLE sleep_sessions ADD COLUMN IF NOT EXISTS night_wakings jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE sleep_sessions ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE sleep_sessions ADD COLUMN IF NOT EXISTS failed boolean NOT NULL DEFAULT false;
ALTER TABLE sleep_sessions ADD COLUMN IF NOT EXISTS dramatic_wake timestamptz;
