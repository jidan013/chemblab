import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isTokenExpiredRuntimeEdge } from "./lib/auth-edge";

const publicPaths = ["/login", "/about", "/contact", "/privacy"];

export const middleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  if (pathname === "/") return NextResponse.next();

  // cek apakah token ada dan token apakah sudah expired
  if (token && isTokenExpiredRuntimeEdge(token)) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("access_token");
    return response;
  }

  // cek apakah path publik dan token ada
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // cek apakah token ada dan bukan path publik
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
