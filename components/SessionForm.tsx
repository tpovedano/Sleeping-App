"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlarmClock,
  CheckCircle2,
  Clock,
  LoaderCircle,
  MapPin,
  Moon,
  Plus,
  RotateCcw,
  Save,
  Sun,
  Trash2,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import { saveSession, type SaveState } from "@/app/actions/sessions";
import {
  ACCOMPANIMENT_OPTIONS,
  LOCATION_OPTIONS,
  NO_ACCOMPANIMENT,
  type SleepKind,
  type SleepSession,
} from "@/lib/types";
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
  failed: boolean;
  noRoutine: boolean;
  routineStart: string;
  sleepStart: string;
  sleepEnd: string;
  moodBefore: number | null;
  moodAfter: number | null;
  accompaniment: string[];
  location: string;
  wakings: WakingField[];
  notes: string;
}

interface WakingField {
  key: number;
  at: string; // datetime-local
  durationMin: string;
  accompaniment: string[];
}

let wakingKey = 0;

const empty = (kind: SleepKind): Fields => ({
  kind,
  failed: false,
  noRoutine: false,
  routineStart: "",
  sleepStart: "",
  sleepEnd: "",
  moodBefore: null,
  moodAfter: null,
  accompaniment: [],
  location: "",
  wakings: [],
  notes: "",
});

function guessKind(): SleepKind {
  const h = new Date().getHours();
  return h >= 18 || h < 6 ? "night" : "nap";
}

/** Une las opciones fijas con las personalizadas usadas antes (sin duplicados). */
const mergeOptions = (base: readonly string[], ...extra: string[][]) => [...new Set([...base, ...extra.flat()])];

/** Alterna una etiqueta; «Solo/a» es excluyente con el resto. */
function toggleTag(list: string[], tag: string): string[] {
  if (list.includes(tag)) return list.filter((t) => t !== tag);
  if (tag === NO_ACCOMPANIMENT) return [NO_ACCOMPANIMENT];
  return [...list.filter((t) => t !== NO_ACCOMPANIMENT), tag];
}

export function SessionForm({
  editing,
  wakeNow,
  openNightId,
  knownAccompaniment = [],
  knownLocations = [],
}: {
  editing?: SleepSession | null;
  wakeNow?: boolean;
  /** noche en curso: impide registrar siestas hasta registrar su despertar */
  openNightId?: string | null;
  knownAccompaniment?: string[];
  knownLocations?: string[];
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveSession, {});
  const [f, setF] = useState<Fields>(() => empty("nap"));
  const [customAcc, setCustomAcc] = useState("");
  const [customLoc, setCustomLoc] = useState("");
  const [saved, setSaved] = useState<null | { failed: boolean; location: string; accompaniment: string[] }>(null);

  // Inicializa en el cliente (la zona horaria del navegador no existe en el servidor)
  useEffect(() => {
    if (editing) {
      setF({
        kind: editing.kind,
        failed: editing.failed,
        noRoutine: !editing.routineStart,
        routineStart: toLocalInput(editing.routineStart),
        sleepStart: toLocalInput(editing.sleepStart),
        sleepEnd: wakeNow && !editing.sleepEnd ? nowLocal() : toLocalInput(editing.sleepEnd),
        moodBefore: editing.moodBefore,
        moodAfter: editing.moodAfter,
        accompaniment: editing.accompaniment,
        location: editing.location ?? "",
        wakings: (editing.wakings ?? []).map((w) => ({
          key: ++wakingKey,
          at: toLocalInput(w.at),
          durationMin: String(w.durationMin),
          accompaniment: w.accompaniment,
        })),
        notes: editing.notes ?? "",
      });
    } else {
      setF(empty(guessKind()));
    }
  }, [editing, wakeNow]);

  useEffect(() => {
    if (state.ok && state.savedAt) {
      setF((p) => {
        setSaved({ failed: !!state.failed, location: p.location, accompaniment: p.accompaniment });
        return empty(state.failed ? "nap" : guessKind());
      });
      if (!state.failed) {
        const t = setTimeout(() => setSaved(null), 4000);
        return () => clearTimeout(t);
      }
    }
  }, [state.ok, state.savedAt, state.failed]);

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((p) => ({ ...p, [k]: v }));

  const isNight = f.kind === "night";
  const isFailed = !isNight && f.failed;
  const napBlocked = !isNight && !!openNightId && !editing;

  const routineMin = useMemo(() => {
    if (f.noRoutine || !f.routineStart || !f.sleepStart) return null;
    const d = (Date.parse(f.sleepStart) - Date.parse(f.routineStart)) / 60_000;
    return d >= 0 ? d : null;
  }, [f.noRoutine, f.routineStart, f.sleepStart]);
  const sleepMin = useMemo(() => {
    if (!f.sleepStart || !f.sleepEnd) return null;
    const d = (Date.parse(f.sleepEnd) - Date.parse(f.sleepStart)) / 60_000;
    return d > 0 ? d : null;
  }, [f.sleepStart, f.sleepEnd]);

  const addCustomAcc = () => {
    const tag = customAcc.trim().slice(0, 40);
    if (tag && !f.accompaniment.includes(tag)) set("accompaniment", toggleTag(f.accompaniment, tag));
    setCustomAcc("");
  };
  const addCustomLoc = () => {
    const tag = customLoc.trim().slice(0, 40);
    if (tag) set("location", tag);
    setCustomLoc("");
  };

  const addWaking = () =>
    setF((p) => ({
      ...p,
      wakings: [...p.wakings, { key: ++wakingKey, at: "", durationMin: isNight ? "10" : "5", accompaniment: [] }],
    }));
  const updateWaking = (key: number, patch: Partial<WakingField>) =>
    setF((p) => ({ ...p, wakings: p.wakings.map((w) => (w.key === key ? { ...w, ...patch } : w)) }));
  const removeWaking = (key: number) => setF((p) => ({ ...p, wakings: p.wakings.filter((w) => w.key !== key) }));
  const wakingsJson = JSON.stringify(
    isFailed ? [] : f.wakings.map((w) => ({ at: toIso(w.at), durationMin: Number(w.durationMin), accompaniment: w.accompaniment })),
  );
  const wakingTotal = f.wakings.reduce((a, w) => a + (Number(w.durationMin) || 0), 0);

  const accOptions = mergeOptions(ACCOMPANIMENT_OPTIONS, knownAccompaniment, f.accompaniment);
  const locOptions = mergeOptions(LOCATION_OPTIONS, knownLocations, f.location ? [f.location] : []);

  const startAnotherAttempt = () => {
    if (!saved) return;
    setF({ ...empty("nap"), location: saved.location, accompaniment: saved.accompaniment });
    setSaved(null);
  };

  return (
    <form action={action} id="formulario" className="card min-w-0 scroll-mt-24 p-5 sm:p-7">
      <input type="hidden" name="id" value={editing?.id ?? ""} />
      <input type="hidden" name="kind" value={f.kind} />
      <input type="hidden" name="failed" value={isFailed ? "1" : ""} />
      <input type="hidden" name="noRoutine" value={f.noRoutine ? "1" : ""} />
      <input type="hidden" name="routineStart" value={f.noRoutine ? "" : toIso(f.routineStart)} />
      <input type="hidden" name="sleepStart" value={toIso(f.sleepStart)} />
      <input type="hidden" name="sleepEnd" value={toIso(f.sleepEnd)} />
      <input type="hidden" name="location" value={f.location} />
      {f.accompaniment.map((a) => (
        <input key={a} type="hidden" name="accompaniment" value={a} />
      ))}
      <input type="hidden" name="wakings" value={wakingsJson} />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl font-semibold text-ink">{editing ? "Editar registro" : "Nuevo registro"}</h2>
          <p className="mt-1 text-sm text-muted">Las horas se guardan en tu zona horaria local.</p>
        </div>
        {editing && (
          <Link href="/registro" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-muted hover:bg-white/5 hover:text-ink">
            <X className="size-4" aria-hidden /> Cancelar
          </Link>
        )}
      </div>

      {saved?.failed && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100" role="status">
          <XCircle className="size-5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">Siesta fallida registrada.</span>
          <button
            type="button"
            onClick={startAnotherAttempt}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-amber-400/20 px-4 font-semibold text-amber-50 transition hover:bg-amber-400/30"
          >
            <RotateCcw className="size-4" aria-hidden /> Registrar otro intento
          </button>
        </div>
      )}

      {/* Tipo */}
      <div role="radiogroup" aria-label="Tipo de sueño" className="mb-6 grid grid-cols-2 gap-3">
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
            className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition ${
              f.kind === k ? on : "border-line bg-white/[0.03] text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${f.kind === k ? "bg-white/10" : "bg-white/5"}`}>
              <Icon className="size-6" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{label}</span>
              <span className="block text-xs opacity-80">{sub}</span>
            </span>
          </button>
        ))}
      </div>

      {napBlocked && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100" role="alert">
          <TriangleAlert className="size-5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">La noche sigue en curso. Registra a qué hora se despertó antes de añadir una siesta.</span>
          <Link
            href={`/registro?editar=${openNightId}&despertar=1#formulario`}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-400/20 px-4 font-semibold text-amber-50 transition hover:bg-amber-400/30"
          >
            <AlarmClock className="size-4" aria-hidden /> Registrar despertar
          </Link>
        </div>
      )}

      {/* Resultado de la siesta */}
      {!isNight && (
        <div role="radiogroup" aria-label="¿Se durmió?" className="mb-6 flex flex-wrap gap-2">
          {[
            { v: false, label: "Se durmió", Icon: CheckCircle2 },
            { v: true, label: "No se durmió (siesta fallida)", Icon: XCircle },
          ].map(({ v, label, Icon }) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={f.failed === v}
              onClick={() => setF((p) => ({ ...p, failed: v, wakings: v ? [] : p.wakings }))}
              className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                f.failed === v
                  ? v
                    ? "border-amber-400/60 bg-amber-400/15 text-amber-100"
                    : "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
                  : "border-line bg-white/[0.03] text-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
      )}

      {/* Horas */}
      <ol className="mb-6 space-y-3">
        <TimeField
          step={1}
          id="routine"
          label="Inicio de la rutina"
          hint={f.noRoutine ? "Sin rutina" : isNight ? "Baño, pijama, cuento…" : "Cuando empieza a prepararse"}
          value={f.noRoutine ? "" : f.routineStart}
          onChange={(v) => set("routineStart", v)}
          required={!f.noRoutine}
          disabled={f.noRoutine}
          extra={
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-ink-2 sm:mt-0">
              <input
                type="checkbox"
                checked={f.noRoutine}
                onChange={(e) => set("noRoutine", e.target.checked)}
                className="size-4 cursor-pointer accent-indigo-400"
              />
              No hubo rutina
            </label>
          }
        />
        <TimeField
          step={2}
          id="start"
          label={isFailed ? "Inicio del intento" : "Se quedó dormido/a"}
          hint={
            isFailed
              ? "Cuando se intentó dormir"
              : routineMin != null
                ? `Rutina: ${formatDuration(routineMin)}`
                : "Hora en que se durmió"
          }
          value={f.sleepStart}
          onChange={(v) => set("sleepStart", v)}
          required
        />
        <TimeField
          step={3}
          id="end"
          label={isFailed ? "Fin del intento" : "Se despertó"}
          hint={
            isFailed
              ? sleepMin != null
                ? `Intento de ${formatDuration(sleepMin)}`
                : "Cuando se dejó de intentar"
              : sleepMin != null
                ? `Durmió ${formatDuration(sleepMin - (isFailed ? 0 : wakingTotal))}`
                : "Vacío si aún duerme"
          }
          value={f.sleepEnd}
          onChange={(v) => set("sleepEnd", v)}
          required={isFailed}
          onClear={
            f.sleepEnd && !isFailed
              ? () => setF((p) => ({ ...p, sleepEnd: "", moodAfter: null }))
              : undefined
          }
          clearLabel="Aún duerme"
        />
      </ol>

      {(routineMin != null || (sleepMin != null && !isFailed)) && (
        <div className="mb-6 flex flex-wrap gap-2" aria-live="polite">
          {routineMin != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-routine/15 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Clock className="size-3.5" aria-hidden /> Rutina {formatDuration(routineMin)}
            </span>
          )}
          {sleepMin != null && !isFailed && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                isNight ? "bg-night/15 text-indigo-200" : "bg-nap/15 text-amber-200"
              }`}
            >
              {isNight ? <Moon className="size-3.5" aria-hidden /> : <Sun className="size-3.5" aria-hidden />} Sueño{" "}
              {formatDuration(sleepMin - wakingTotal)}
            </span>
          )}
        </div>
      )}

      {/* Humor */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <MoodPicker name="moodBefore" legend="Humor antes de dormirse" value={f.moodBefore} onChange={(v) => set("moodBefore", v)} />
        <MoodPicker
          name="moodAfter"
          legend={isFailed ? "Humor al terminar el intento" : "Humor al despertar"}
          value={f.moodAfter}
          onChange={(v) => set("moodAfter", v)}
          disabled={!f.sleepEnd}
          hint={!f.sleepEnd ? (isFailed ? "Disponible al indicar el fin del intento." : "Disponible al indicar la hora de despertar.") : undefined}
        />
      </div>

      {/* Acompañamiento */}
      <ChipGroup
        legend="Acompañamiento para dormirse"
        options={accOptions}
        isOn={(t) => f.accompaniment.includes(t)}
        onToggle={(t) => set("accompaniment", toggleTag(f.accompaniment, t))}
        labelOf={(t) => (t === NO_ACCOMPANIMENT ? "Solo/a (sin ayuda)" : t)}
        customValue={customAcc}
        onCustomChange={setCustomAcc}
        onCustomAdd={addCustomAcc}
        customId="custom-acc"
        customLabel="Añadir otro acompañamiento"
      />

      {/* Dónde durmió */}
      <ChipGroup
        legend={isFailed ? "Dónde se intentó" : "Dónde durmió"}
        icon={<MapPin className="size-4 text-muted" aria-hidden />}
        options={locOptions}
        isOn={(t) => f.location === t}
        onToggle={(t) => set("location", f.location === t ? "" : t)}
        labelOf={(t) => t}
        customValue={customLoc}
        onCustomChange={setCustomLoc}
        onCustomAdd={addCustomLoc}
        customId="custom-loc"
        customLabel="Añadir otro lugar"
        single
      />

      {/* Despertares */}
      {!isFailed && (
        <div role="group" aria-labelledby="wakings-title" className="mb-6 min-w-0 rounded-2xl border border-line bg-white/[0.02] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 id="wakings-title" className="min-w-0 text-sm font-semibold text-ink">
              {isNight ? "Despertares nocturnos" : "Despertares durante la siesta"}
              <span className="ml-2 font-normal text-muted">
                {f.wakings.length
                  ? `${f.wakings.length} · ${formatDuration(wakingTotal)} despierto/a`
                  : isNight
                    ? "Ninguno registrado"
                    : "Ninguno: la hizo de corrido"}
              </span>
            </h3>
            <button
              type="button"
              onClick={addWaking}
              className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                isNight ? "border-night/40 bg-night/10 text-indigo-100 hover:bg-night/20" : "border-nap/40 bg-nap/10 text-amber-100 hover:bg-nap/20"
              }`}
            >
              <Plus className="size-4" aria-hidden /> Añadir despertar
            </button>
          </div>
          {f.wakings.length > 0 && (
            <ol className="space-y-3">
              {f.wakings.map((w, i) => (
                <li key={w.key} className="min-w-0 rounded-xl border border-line bg-bg/40 p-3">
                  <div className="mb-3 flex flex-wrap items-end gap-3">
                    <span className="grid size-7 shrink-0 place-items-center self-center rounded-full bg-white/10 text-xs font-bold text-ink">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 basis-48">
                      <label htmlFor={`w-at-${w.key}`} className="mb-1 block text-xs text-muted">
                        Hora del despertar
                      </label>
                      <input
                        id={`w-at-${w.key}`}
                        type="datetime-local"
                        value={w.at}
                        onChange={(e) => updateWaking(w.key, { at: e.target.value })}
                        required
                        className="h-10 w-full min-w-0 rounded-xl border border-line-strong bg-bg/60 px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                      />
                    </div>
                    <div className="w-28">
                      <label htmlFor={`w-dur-${w.key}`} className="mb-1 block text-xs text-muted">
                        Duración (min)
                      </label>
                      <input
                        id={`w-dur-${w.key}`}
                        type="number"
                        min={1}
                        max={240}
                        inputMode="numeric"
                        value={w.durationMin}
                        onChange={(e) => updateWaking(w.key, { durationMin: e.target.value })}
                        required
                        className="h-10 w-full rounded-xl border border-line-strong bg-bg/60 px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeWaking(w.key)}
                      className="grid size-10 cursor-pointer place-items-center rounded-xl text-muted transition hover:bg-rose-500/15 hover:text-rose-200"
                      aria-label={`Quitar despertar ${i + 1}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  <p className="mb-1.5 text-xs text-muted">¿Cómo se volvió a dormir?</p>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Ayuda para volver a dormirse en el despertar ${i + 1}`}>
                    {accOptions.map((tag) => {
                      const on = w.accompaniment.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={on}
                          onClick={() => updateWaking(w.key, { accompaniment: toggleTag(w.accompaniment, tag) })}
                          className={`h-7 max-w-full cursor-pointer truncate rounded-full border px-2.5 text-xs font-medium transition ${
                            on
                              ? "border-primary/70 bg-primary/20 text-indigo-100"
                              : "border-line bg-white/[0.03] text-muted hover:border-line-strong hover:text-ink"
                          }`}
                        >
                          {tag === NO_ACCOMPANIMENT ? "Sola/o, sin ayuda" : tag}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-xs text-muted">El tiempo despierto se descuenta de las horas de sueño.</p>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="notes" className="mb-2 block text-sm font-medium text-ink-2">
          Notas <span className="text-muted">(opcional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={1000}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Despertares, ruido, dientes, viaje…"
          className="block w-full resize-y rounded-2xl border border-line-strong bg-white/5 px-4 py-3 text-sm text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || napBlocked}
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-6 font-semibold text-white shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Save className="size-5" aria-hidden />}
          {editing ? "Guardar cambios" : isFailed ? "Guardar siesta fallida" : "Guardar registro"}
        </button>
        <p aria-live="polite" className="min-w-0 text-sm">
          {state.error && <span className="text-bad">{state.error}</span>}
          {saved && !saved.failed && !state.error && (
            <span className="inline-flex items-center gap-1.5 text-good">
              <CheckCircle2 className="size-4" aria-hidden /> Registro guardado
            </span>
          )}
        </p>
      </div>
    </form>
  );
}

function ChipGroup({
  legend,
  icon,
  options,
  isOn,
  onToggle,
  labelOf,
  customValue,
  onCustomChange,
  onCustomAdd,
  customId,
  customLabel,
  single,
}: {
  legend: string;
  icon?: React.ReactNode;
  options: string[];
  isOn: (t: string) => boolean;
  onToggle: (t: string) => void;
  labelOf: (t: string) => string;
  customValue: string;
  onCustomChange: (v: string) => void;
  onCustomAdd: () => void;
  customId: string;
  customLabel: string;
  single?: boolean;
}) {
  return (
    <fieldset className="mb-6 min-w-0">
      <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-2">
        {icon}
        {legend}
        {single && <span className="font-normal text-muted">· elige uno</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((tag) => {
          const on = isOn(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(tag)}
              className={`h-9 max-w-full cursor-pointer truncate rounded-full border px-3.5 text-sm font-medium transition ${
                on
                  ? "border-primary/70 bg-primary/20 text-indigo-100"
                  : "border-line bg-white/[0.03] text-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              {labelOf(tag)}
            </button>
          );
        })}
        <span className="inline-flex h-9 max-w-full items-center rounded-full border border-dashed border-line-strong pl-3.5 pr-1">
          <label htmlFor={customId} className="sr-only">
            {customLabel}
          </label>
          <input
            id={customId}
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCustomAdd();
              }
            }}
            placeholder="Otro…"
            maxLength={40}
            className="w-24 min-w-0 bg-transparent text-sm text-ink placeholder:text-muted/70 focus:outline-none"
          />
          <button
            type="button"
            onClick={onCustomAdd}
            className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-white/10 hover:text-ink"
            aria-label={customLabel}
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </span>
      </div>
    </fieldset>
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
  disabled,
  extra,
  onClear,
  clearLabel,
}: {
  step: number;
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  extra?: React.ReactNode;
  onClear?: () => void;
  clearLabel?: string;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-ink">{step}</span>
        <div className="min-w-0">
          <label htmlFor={id} className="block text-sm font-semibold text-ink">
            {label}
            {required && <span className="sr-only"> (obligatorio)</span>}
          </label>
          <p className="text-xs text-muted">{hint}</p>
          {extra}
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 sm:w-[19rem]">
        <input
          id={id}
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-bg/60 px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-40"
        />
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="h-11 shrink-0 cursor-pointer rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/20"
            title="Borrar la hora de despertar (sigue durmiendo)"
          >
            {clearLabel ?? "Borrar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onChange(nowLocal())}
            disabled={disabled}
            className="h-11 shrink-0 cursor-pointer rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-indigo-200 transition hover:bg-primary/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ahora
          </button>
        )}
      </div>
    </li>
  );
}
