import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

// Comprobación optimista: las páginas y acciones vuelven a verificar la sesión.
export async function proxy(request: NextRequest) {
  const ok = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  if (!ok && pathname !== "/") return NextResponse.redirect(new URL("/", request.url));
  if (ok && pathname === "/") return NextResponse.redirect(new URL("/registro", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/registro/:path*", "/estadisticas/:path*", "/referencias/:path*"],
};
