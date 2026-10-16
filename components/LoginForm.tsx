"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, ArrowRight } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-4" noValidate>
      <label htmlFor="password" className="block text-sm font-medium text-ink-2">
        Contraseña de acceso
      </label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={!!state.error}
          aria-describedby={state.error ? "login-error" : undefined}
          placeholder="••••••••"
          className="h-13 w-full rounded-2xl border border-line-strong bg-white/5 pl-12 pr-12 text-base text-ink placeholder:text-muted/60 transition focus:border-primary focus:bg-white/[0.07] focus:outline-none focus:ring-4 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-xl text-muted transition hover:bg-white/5 hover:text-ink"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {state.error && (
        <p id="login-error" role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="group flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent font-semibold text-white shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
        ) : (
          <>
            Entrar
            <ArrowRight className="size-5 transition group-hover:translate-x-0.5" aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}
