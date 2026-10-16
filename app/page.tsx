import { redirect } from "next/navigation";
import { BarChart3, Clock4, Moon, NotebookPen, Sparkles, Sun } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { isAuthenticated } from "@/lib/session";

const features = [
  {
    icon: NotebookPen,
    title: "Registro en segundos",
    text: "Rutina, hora de dormirse y de despertar, humor antes y después y acompañamiento.",
  },
  {
    icon: BarChart3,
    title: "Dashboard visual",
    text: "Horas de sueño, siestas y comparativas de 1 a 4 semanas de un vistazo.",
  },
  {
    icon: Sparkles,
    title: "Mejores horarios",
    text: "Descubre a qué hora dormir y cuánto tiempo despierto sienta mejor.",
  },
];

export default async function Landing() {
  if (await isAuthenticated()) redirect("/registro");
  return (
    <main className="stars relative min-h-dvh overflow-hidden">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Logo />
          <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-muted sm:inline-flex">
            <LockIcon /> Acceso privado
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.15fr_1fr] lg:py-16">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-200">
              <Moon className="size-3.5" aria-hidden /> Diario de siestas y noches
            </p>
            <h1 className="font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-ink glow-text sm:text-5xl lg:text-6xl">
              Entiende cada descanso,{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-200 bg-clip-text text-transparent">
                duerme mejor
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              Registra las siestas y el sueño nocturno, y deja que el dashboard te muestre las tendencias y los
              horarios que hacen despertar con mejor humor.
            </p>

            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {features.map((f) => (
                <li key={f.title} className="glass rounded-2xl p-4">
                  <f.icon className="mb-3 size-6 text-indigo-300" aria-hidden />
                  <p className="font-semibold text-ink">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <MoonArt />
            <div className="glass relative z-10 rounded-3xl p-6 shadow-2xl shadow-black/40 sm:p-8">
              <h2 className="font-serif text-2xl font-semibold text-ink">Bienvenido/a de nuevo</h2>
              <p className="mt-1.5 mb-6 text-sm text-muted">Introduce la contraseña para acceder a tus registros.</p>
              <LoginForm />
              <PreviewStrip />
            </div>
          </div>
        </section>

        <footer className="pb-2 text-center text-xs text-muted">Hecho con calma para noches tranquilas.</footer>
      </div>
    </main>
  );
}

function LockIcon() {
  return <span className="size-1.5 rounded-full bg-good" aria-hidden />;
}

function MoonArt() {
  return (
    <div aria-hidden className="pointer-events-none absolute -right-20 -top-36 hidden size-44 animate-float opacity-80 lg:block">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-200 via-violet-300 to-violet-600 opacity-90 blur-[1px]" />
      <div className="absolute -left-6 -top-4 size-48 rounded-full bg-bg" />
      <div className="absolute inset-0 rounded-full bg-violet-500/30 blur-3xl" />
    </div>
  );
}

function PreviewStrip() {
  const bars = [
    [64, 18],
    [70, 14],
    [58, 22],
    [74, 16],
    [66, 12],
    [78, 18],
    [72, 20],
  ];
  return (
    <div className="mt-8 rounded-2xl border border-line bg-white/[0.03] p-4" aria-hidden>
      <div className="mb-3 flex items-center justify-between text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock4 className="size-3.5" /> Últimos 7 días
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Moon className="size-3 text-night" /> Noche
          </span>
          <span className="inline-flex items-center gap-1">
            <Sun className="size-3 text-nap" /> Siesta
          </span>
        </span>
      </div>
      <div className="flex h-20 items-end gap-2">
        {bars.map(([night, nap], i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end gap-[2px]">
            <div className="rounded-t-[4px] bg-nap" style={{ height: `${nap}%` }} />
            <div className="bg-night" style={{ height: `${night}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
