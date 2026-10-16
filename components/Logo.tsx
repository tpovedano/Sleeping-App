export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c7d2fe" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="rgb(255 255 255 / 0.06)" stroke="rgb(255 255 255 / 0.1)" />
        <path d="M40 14a20 20 0 1 0 10 30A16 16 0 0 1 40 14z" fill="url(#logo-g)" />
        <circle cx="46" cy="20" r="1.6" fill="#e0e7ff" />
        <circle cx="52" cy="30" r="1" fill="#e0e7ff" />
      </svg>
      <span className="font-serif text-xl font-semibold tracking-tight text-ink">LetSleep</span>
    </span>
  );
}
