import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions, shouldRenew, verifySessionToken } from "./lib/auth";

// Comprobación optimista: las páginas y acciones vuelven a verificar la sesión.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const ok = await verifySessionToken(token);
  const { pathname } = request.nextUrl;
  if (!ok && pathname !== "/") return NextResponse.redirect(new URL("/", request.url));
  const res = ok && pathname === "/" ? NextResponse.redirect(new URL("/registro", request.url)) : NextResponse.next();
  // Sesión deslizante: mientras se use la app, la caducidad se va renovando
  if (ok && shouldRenew(token)) res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions());
  return res;
}

export const config = {
  matcher: ["/", "/registro/:path*", "/estadisticas/:path*", "/referencias/:path*"],
};
