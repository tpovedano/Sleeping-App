"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, NotebookPen } from "lucide-react";

const tabs = [
  { href: "/registro", label: "Registro", icon: NotebookPen },
  { href: "/estadisticas", label: "Estadísticas", icon: LayoutDashboard },
];

export function NavTabs({ variant }: { variant: "top" | "bottom" }) {
  const path = usePathname();
  if (variant === "bottom") {
    return (
      <nav
        aria-label="Secciones"
        className="glass fixed inset-x-3 bottom-3 z-40 grid grid-cols-2 gap-1 rounded-2xl p-1.5 shadow-2xl shadow-black/50 sm:hidden"
      >
        {tabs.map((t) => {
          const active = path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold transition ${
                active ? "bg-primary/25 text-white" : "text-muted hover:text-ink"
              }`}
            >
              <t.icon className="size-5" aria-hidden />
              {t.label}
            </Link>
          );
        })}
      </nav>
    );
  }
  return (
    <nav aria-label="Secciones" className="hidden rounded-2xl border border-line bg-white/[0.03] p-1 sm:flex">
      {tabs.map((t) => {
        const active = path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
              active ? "bg-primary/25 text-white shadow-inner shadow-primary/20" : "text-muted hover:bg-white/5 hover:text-ink"
            }`}
          >
            <t.icon className="size-4" aria-hidden />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
