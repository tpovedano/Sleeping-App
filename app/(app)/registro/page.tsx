import type { Metadata } from "next";
import { SessionForm } from "@/components/SessionForm";
import { SessionList } from "@/components/SessionList";
import { db } from "@/lib/db";
import { appTimezone } from "@/lib/config";
import { NextNapCard } from "@/components/NextNapCard";
import { getReferences } from "@/lib/references";
import { nextNapFor } from "@/lib/stats";
import { openNight } from "@/lib/rules";
import { ACCOMPANIMENT_OPTIONS, LOCATION_OPTIONS } from "@/lib/types";

export const metadata: Metadata = { title: "Registro · LetSleep" };
export const dynamic = "force-dynamic";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; despertar?: string }>;
}) {
  const { editar, despertar } = await searchParams;
  const tz = appTimezone();
  const since = new Date(Date.now() - 60 * 86_400_000);
  const [recent, editing] = await Promise.all([db().list(since), editar ? db().get(editar) : Promise.resolve(null)]);
  const refs = getReferences();
  const nextNap = nextNapFor(recent, { tz, refs });
  const open = openNight(recent);
  // Opciones personalizadas usadas antes, para poder reutilizarlas
  const knownAccompaniment = [
    ...new Set(recent.flatMap((s) => [...s.accompaniment, ...s.wakings.flatMap((w) => w.accompaniment)])),
  ].filter((t) => !(ACCOMPANIMENT_OPTIONS as readonly string[]).includes(t));
  const knownLocations = [...new Set(recent.map((s) => s.location).filter((l): l is string => !!l))].filter(
    (t) => !(LOCATION_OPTIONS as readonly string[]).includes(t),
  );
  const recent14 = recent.filter((s) => Date.parse(s.sleepStart) >= Date.now() - 14 * 86_400_000);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <section aria-label="Formulario de registro" className="min-w-0 space-y-4">
        <NextNapCard next={nextNap} latestNapStart={refs.latestNapStart} />
        <SessionForm
          key={editing?.id ?? "new"}
          editing={editing}
          wakeNow={despertar === "1"}
          openNightId={open?.id ?? null}
          knownAccompaniment={knownAccompaniment}
          knownLocations={knownLocations}
        />
      </section>
      <section aria-labelledby="recientes" className="min-w-0">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 id="recientes" className="font-serif text-2xl font-semibold text-ink">
              Últimos registros
            </h2>
            <p className="text-sm text-muted">Últimos 14 días</p>
          </div>
        </div>
        <SessionList sessions={recent14} tz={tz} />
      </section>
    </div>
  );
}
