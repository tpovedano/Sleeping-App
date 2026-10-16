"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, checkPassword, createSessionToken, expectedPassword } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!expectedPassword()) return { error: "La aplicación no tiene contraseña configurada (APP_PASSWORD)." };
  const password = String(form.get("password") ?? "");
  if (!(await checkPassword(password))) {
    await new Promise((r) => setTimeout(r, 600)); // frena intentos por fuerza bruta
    return { error: "Contraseña incorrecta. Inténtalo de nuevo." };
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/registro");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
