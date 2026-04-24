import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production-please"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session")?.value;

  // Verify token
  let session = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      session = payload;
    } catch {
      session = null;
    }
  }

  // Admin routes — require admin role
  if (pathname.startsWith("/admin")) {
    if (!session || session.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Admin API routes
  if (pathname.startsWith("/api/admin")) {
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Protected user pages (add slugs here as you add pages)
  const protectedPages = ["/test"];
  if (protectedPages.includes(pathname)) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Admin can access everything
    if (session.role === "admin") return NextResponse.next();
    // Users need page in their allowedPages
    const allowedPages = (session.allowedPages as string[]) ?? [];
    const slug = pathname.replace("/", "");
    if (!allowedPages.includes(slug)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/test"],
};
