CREATE TABLE IF NOT EXISTS sleep_sessions (
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
);

CREATE INDEX IF NOT EXISTS sleep_sessions_sleep_start_idx ON sleep_sessions (sleep_start DESC);
