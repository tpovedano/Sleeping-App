import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { db } from "@/lib/db";
import { appTimezone } from "@/lib/config";
import { buildDashboard, type RangeWeeks } from "@/lib/stats";
import { getReferences } from "@/lib/references";

export const metadata: Metadata = { title: "Estadísticas · LetSleep" };
export const dynamic = "force-dynamic";

export default async function EstadisticasPage({ searchParams }: { searchParams: Promise<{ semanas?: string }> }) {
  const { semanas } = await searchParams;
  const n = Number(semanas);
  const weeks = ([1, 2, 3, 4].includes(n) ? n : 2) as RangeWeeks;
  const tz = appTimezone();
  // Margen de 2 días para noches que empiezan antes del primer día del periodo y ventanas de vigilia
  const since = new Date(Date.now() - (weeks * 7 + 2) * 86_400_000);
  const sessions = await db().list(since);
  const data = buildDashboard(sessions, { tz, weeks, refs: getReferences() });
  return <Dashboard data={data} />;
}
