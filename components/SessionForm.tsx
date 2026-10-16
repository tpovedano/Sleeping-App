"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, LoaderCircle, Moon, Plus, Save, Sun, X } from "lucide-react";
import { saveSession, type SaveState } from "@/app/actions/sessions";
import { ACCOMPANIMENT_OPTIONS, NO_ACCOMPANIMENT, type SleepKind, type SleepSession } from "@/lib/types";
import { formatDuration } from "@/lib/time";
import { MoodPicker } from "./MoodPicker";

/** ISO → valor para <input type="datetime-local"> en la hora local del navegador */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
const nowLocal = () => toLocalInput(new Date().toISOString());
const toIso = (local: string) => (local ? new Date(local).toISOString() : "");

interface Fields {
  kind: SleepKind;
  routineStart: string;
  sleepStart: string;
  sleepEnd: string;
  moodBefore: number | null;
  moodAfter: number | null;
  accompaniment: string[];
  notes: string;
}

const empty = (kind: SleepKind): Fields => ({
  kind,
  routineStart: "",
  sleepStart: "",
  sleepEnd: "",
  moodBefore: null,
  moodAfter: null,
  accompaniment: [],
  notes: "",
});

function guessKind(): SleepKind {
  const h = new Date().getHours();
  return h >= 18 || h < 6 ? "night" : "nap";
}

export function SessionForm({ editing, wakeNow }: { editing?: SleepSession | null; wakeNow?: boolean }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveSession, {});
  const [f, setF] = useState<Fields>(() => empty("nap"));
  const [custom, setCustom] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  // Inicializa en el cliente (la zona horaria del navegador no existe en el servidor)
  useEffect(() => {
    if (editing) {
      setF({
        kind: editing.kind,
        routineStart: toLocalInput(editing.routineStart),
        sleepStart: toLocalInput(editing.sleepStart),
        sleepEnd: wakeNow && !editing.sleepEnd ? nowLocal() : toLocalInput(editing.sleepEnd),
        moodBefore: editing.moodBefore,
        moodAfter: editing.moodAfter,
        accompaniment: editing.accompaniment,
        notes: editing.notes ?? "",
      });
    } else {
      setF(empty(guessKind()));
    }
  }, [editing, wakeNow]);

  useEffect(() => {
    if (state.ok && state.savedAt) {
      setF(empty(guessKind()));
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 3500);
      return () => clearTimeout(t);
    }
  }, [state.ok, state.savedAt]);

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((p) => ({ ...p, [k]: v }));

  const routineMin = useMemo(() => {
    if (!f.routineStart || !f.sleepStart) return null;
    const d = (Date.parse(f.sleepStart) - Date.parse(f.routineStart)) / 60_000;
    return d >= 0 ? d : null;
  }, [f.routineStart, f.sleepStart]);
  const sleepMin = useMemo(() => {
    if (!f.sleepStart || !f.sleepEnd) return null;
    const d = (Date.parse(f.sleepEnd) - Date.parse(f.sleepStart)) / 60_000;
    return d > 0 ? d : null;
  }, [f.sleepStart, f.sleepEnd]);

  const toggleAcc = (tag: string) =>
    setF((p) => {
      const has = p.accompaniment.includes(tag);
      if (has) return { ...p, accompaniment: p.accompaniment.filter((t) => t !== tag) };
      if (tag === NO_ACCOMPANIMENT) return { ...p, accompaniment: [NO_ACCOMPANIMENT] };
      return { ...p, accompaniment: [...p.accompaniment.filter((t) => t !== NO_ACCOMPANIMENT), tag] };
    });

  const addCustom = () => {
    const tag = custom.trim().slice(0, 40);
    if (tag && !f.accompaniment.includes(tag)) toggleAcc(tag);
    setCustom("");
  };

  const options = [...ACCOMPANIMENT_OPTIONS, ...f.accompaniment.filter((t) => !(ACCOMPANIMENT_OPTIONS as readonly string[]).includes(t))];
  const isNight = f.kind === "night";

  return (
    <form action={action} id="formulario" className="card scroll-mt-24 p-5 sm:p-7">
      <input type="hidden" name="id" value={editing?.id ?? ""} />
      <input type="hidden" name="kind" value={f.kind} />
      <input type="hidden" name="routineStart" value={toIso(f.routineStart)} />
      <input type="hidden" name="sleepStart" value={toIso(f.sleepStart)} />
      <input type="hidden" name="sleepEnd" value={toIso(f.sleepEnd)} />
      {f.accompaniment.map((a) => (
        <input key={a} type="hidden" name="accompaniment" value={a} />
      ))}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-ink">{editing ? "Editar registro" : "Nuevo registro"}</h2>
          <p className="mt-1 text-sm text-muted">Las horas se guardan en tu zona horaria local.</p>
        </div>
        {editing && (
          <Link href="/registro" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-muted hover:bg-white/5 hover:text-ink">
            <X className="size-4" aria-hidden /> Cancelar
          </Link>
        )}
      </div>

      {/* Tipo */}
      <div role="radiogroup" aria-label="Tipo de sueño" className="mb-7 grid grid-cols-2 gap-3">
        {(
          [
            { k: "nap", label: "Siesta", sub: "Descanso de día", Icon: Sun, on: "border-nap/70 bg-nap/15 text-amber-100" },
            { k: "night", label: "Noche", sub: "Sueño nocturno", Icon: Moon, on: "border-night/70 bg-night/15 text-indigo-100" },
          ] as const
        ).map(({ k, label, sub, Icon, on }) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={f.kind === k}
            onClick={() => set("kind", k)}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition ${
              f.kind === k ? on : "border-line bg-white/[0.03] text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            <span className={`grid size-11 place-items-center rounded-xl ${f.kind === k ? "bg-white/10" : "bg-white/5"}`}>
              <Icon className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold">{label}</span>
              <span className="block text-xs opacity-80">{sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Horas */}
      <ol className="mb-7 space-y-3">
        <TimeField
          step={1}
          id="routine"
          label="Inicio de la rutina"
          hint={isNight ? "Baño, pijama, cuento…" : "Cuando empieza a prepararse"}
          value={f.routineStart}
          onChange={(v) => set("routineStart", v)}
          required
        />
        <TimeField
          step={2}
          id="start"
          label="Se quedó dormido/a"
          hint={routineMin != null ? `Rutina: ${formatDuration(routineMin)}` : "Hora en que se durmió"}
          value={f.sleepStart}
          onChange={(v) => set("sleepStart", v)}
          required
        />
        <TimeField
          step={3}
          id="end"
          label="Se despertó"
          hint={sleepMin != null ? `Durmió ${formatDuration(sleepMin)}` : "Vacío si aún duerme"}
          value={f.sleepEnd}
          onChange={(v) => set("sleepEnd", v)}
        />
      </ol>

      {(routineMin != null || sleepMin != null) && (
        <div className="mb-7 flex flex-wrap gap-2" aria-live="polite">
          {routineMin != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-routine/15 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Clock className="size-3.5" aria-hidden /> Rutina {formatDuration(routineMin)}
            </span>
          )}
          {sleepMin != null && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                isNight ? "bg-night/15 text-indigo-200" : "bg-nap/15 text-amber-200"
              }`}
            >
              {isNight ? <Moon className="size-3.5" aria-hidden /> : <Sun className="size-3.5" aria-hidden />} Sueño{" "}
              {formatDuration(sleepMin)}
            </span>
          )}
        </div>
      )}

      {/* Humor */}
      <div className="mb-7 grid gap-6 md:grid-cols-2">
        <MoodPicker name="moodBefore" legend="Humor antes de dormirse" value={f.moodBefore} onChange={(v) => set("moodBefore", v)} />
        <MoodPicker
          name="moodAfter"
          legend="Humor al despertar"
          value={f.moodAfter}
          onChange={(v) => set("moodAfter", v)}
          disabled={!f.sleepEnd}
          hint={!f.sleepEnd ? "Disponible al indicar la hora de despertar." : undefined}
        />
      </div>

      {/* Acompañamiento */}
      <fieldset className="mb-7">
        <legend className="mb-2 text-sm font-medium text-ink-2">Acompañamiento para dormirse</legend>
        <div className="flex flex-wrap gap-2">
          {options.map((tag) => {
            const on = f.accompaniment.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => toggleAcc(tag)}
                className={`h-9 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition ${
                  on
                    ? "border-primary/70 bg-primary/20 text-indigo-100"
                    : "border-line bg-white/[0.03] text-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {tag === NO_ACCOMPANIMENT ? "Solo/a (sin ayuda)" : tag}
              </button>
            );
          })}
          <span className="inline-flex h-9 items-center rounded-full border border-dashed border-line-strong pl-3.5 pr-1">
            <label htmlFor="custom-acc" className="sr-only">
              Otro acompañamiento
            </label>
            <input
              id="custom-acc"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Otro…"
              maxLength={40}
              className="w-24 bg-transparent text-sm text-ink placeholder:text-muted/70 focus:outline-none"
            />
            <button
              type="button"
              onClick={addCustom}
              className="grid size-7 cursor-pointer place-items-center rounded-full text-muted hover:bg-white/10 hover:text-ink"
              aria-label="Añadir acompañamiento"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </span>
        </div>
      </fieldset>

      <div className="mb-7">
        <label htmlFor="notes" className="mb-2 block text-sm font-medium text-ink-2">
          Notas <span className="text-muted">(opcional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={500}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Despertares, ruido, dientes, viaje…"
          className="w-full resize-y rounded-2xl border border-line-strong bg-white/5 px-4 py-3 text-sm text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-6 font-semibold text-white shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Save className="size-5" aria-hidden />}
          {editing ? "Guardar cambios" : "Guardar registro"}
        </button>
        <p aria-live="polite" className="text-sm">
          {state.error && <span className="text-bad">{state.error}</span>}
          {showSaved && !state.error && (
            <span className="inline-flex items-center gap-1.5 text-good">
              <CheckCircle2 className="size-4" aria-hidden /> Registro guardado
            </span>
          )}
        </p>
      </div>
    </form>
  );
}

function TimeField({
  step,
  id,
  label,
  hint,
  value,
  onChange,
  required,
}: {
  step: number;
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-ink">{step}</span>
        <div>
          <label htmlFor={id} className="block text-sm font-semibold text-ink">
            {label}
            {required && <span className="sr-only"> (obligatorio)</span>}
          </label>
          <p className="text-xs text-muted">{hint}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:w-[17rem]">
        <input
          id={id}
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-bg/60 px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => onChange(nowLocal())}
          className="h-11 shrink-0 cursor-pointer rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-indigo-200 transition hover:bg-primary/20 hover:text-white"
        >
          Ahora
        </button>
      </div>
    </li>
  );
}
