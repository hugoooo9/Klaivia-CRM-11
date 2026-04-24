// Proxy Next 16 — bloque tout sauf /login + /api/auth si pas de session valide.
// Runtime Node.js par défaut (Next 16) → on peut utiliser node:crypto.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Toujours laisser passer /login et les routes auth
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionToken(token)) {
    return NextResponse.next();
  }

  // Non authentifié → redirige vers /login en gardant la destination
  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Exclut assets statiques + favicon du contrôle
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
