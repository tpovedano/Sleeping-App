import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { NavTabs } from "@/components/NavTabs";
import { requireAuth } from "@/lib/session";
import { isDemoStore } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <div className="min-h-dvh pb-24 sm:pb-10">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/registro" aria-label="Inicio">
            <Logo size={32} />
          </Link>
          <NavTabs variant="top" />
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm text-muted transition hover:bg-white/5 hover:text-ink"
            >
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </header>
      {isDemoStore() && (
        <p className="border-b border-warn/20 bg-warn/10 px-4 py-2 text-center text-xs text-amber-200">
          Modo demo: sin DATABASE_URL los datos son de ejemplo y se guardan solo en memoria.
        </p>
      )}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      <NavTabs variant="bottom" />
    </div>
  );
}
