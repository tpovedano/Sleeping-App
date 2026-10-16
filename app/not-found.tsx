import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="font-serif text-5xl font-semibold text-ink">404</p>
        <p className="mt-2 text-muted">Esta página se ha quedado dormida.</p>
        <Link href="/" className="mt-6 inline-block font-semibold text-indigo-300 hover:underline">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
