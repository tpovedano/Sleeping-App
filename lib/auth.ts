// Sesión mínima basada en una cookie firmada con HMAC (Web Crypto: funciona en Proxy y en el servidor).
export const SESSION_COOKIE = "sleep_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

const enc = new TextEncoder();

function secret(): string | null {
  const s = process.env.AUTH_SECRET || process.env.APP_PASSWORD;
  if (s) return s;
  return process.env.NODE_ENV === "production" ? null : "dev-secret";
}

export function expectedPassword(): string | null {
  return process.env.APP_PASSWORD || (process.env.NODE_ENV === "production" ? null : "dormir");
}

function b64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** El token incluye la fecha de expiración y depende de la contraseña: cambiarla invalida las sesiones. */
export async function createSessionToken(): Promise<string> {
  const key = secret();
  if (!key) throw new Error("Configura APP_PASSWORD");
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `v1.${exp}`;
  return `${payload}.${await hmac(`${payload}.${expectedPassword() ?? ""}`, key)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  const key = secret();
  if (!token || !key) return false;
  const [v, exp, sig] = token.split(".");
  if (v !== "v1" || !exp || !sig || Number(exp) * 1000 < Date.now()) return false;
  return safeEqual(sig, await hmac(`v1.${exp}.${expectedPassword() ?? ""}`, key));
}

export async function checkPassword(input: string): Promise<boolean> {
  const expected = expectedPassword();
  if (!expected) return false;
  // Compara hashes para que la duración no dependa de la longitud
  const [a, b] = await Promise.all([hmac(input, "pw"), hmac(expected, "pw")]);
  return safeEqual(a, b);
}
