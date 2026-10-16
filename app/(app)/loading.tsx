export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-white/5" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-white/5" />
    </div>
  );
}
