import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/", "/login", "/icon", "/apple-icon"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith("/_next") || pathname.startsWith("/api/public")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<{ user?: SessionData }>(request, response, sessionOptions);

  if (!session.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sliding 30-minute idle timeout: re-saving on every authenticated request
  // re-issues the session cookie with a fresh maxAge, so an active user's
  // cookie never actually reaches its expiry — 30 minutes with no requests
  // lets it expire outright, and the check above then redirects to /login.
  await session.save();

  return response;
}

// Coarse authentication gate only (edge-safe: decodes the signed cookie,
// no DB access). Authoritative per-module/action permission checks happen
// in Server Components (requireActiveUser) and Server Actions (requireModule),
// which run in the Node runtime and can query role_permissions from Postgres.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
