import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareSupabaseClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const session = user
    ? await supabase
        .from("users")
        .select("role,allowed_pages,departments")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : null;
  const role = session?.data?.role ?? null;
  const allowedPages = session?.data?.allowed_pages ?? [];
  const departments = session?.data?.departments ?? [];

  // Admin routes — require admin role
  if (pathname.startsWith("/admin")) {
    if (!user || role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Admin API routes
  if (pathname.startsWith("/api/admin")) {
    if (!user || role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return response;
  }

  // Protected API routes — require any valid session
  if (pathname.startsWith("/api/analyze-loss-run")) {
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return response;
  }

  if (pathname.startsWith("/api/employer-application") || pathname.startsWith("/api/claims-validation") || pathname.startsWith("/api/gap-quote")) {
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "admin" && !departments.includes("Benefits")) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }
    return response;
  }

  if (
    pathname === "/pnc" ||
    pathname === "/benefits" ||
    pathname === "/employer-application" ||
    pathname === "/claims-validation" ||
    pathname === "/gap-quote"
  ) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (role === "admin") return response;
    if (pathname === "/pnc" && !departments.includes("P&C")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (
      (pathname === "/benefits" ||
        pathname === "/employer-application" ||
        pathname === "/claims-validation" ||
        pathname === "/gap-quote") &&
      !departments.includes("Benefits")
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Protected user pages (add slugs here as you add pages)
  const protectedPages = ["/test", "/loss-run-analyzer"];
  if (protectedPages.includes(pathname)) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Admin can access everything
    if (role === "admin") return response;
    // Users need page in their allowedPages
    const slug = pathname.replace("/", "");
    if (!allowedPages.includes(slug)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/analyze-loss-run",
    "/test",
    "/loss-run-analyzer",
    "/pnc",
    "/benefits",
    "/employer-application",
    "/claims-validation",
    "/gap-quote",
    "/api/employer-application/:path*",
    "/api/claims-validation/:path*",
    "/api/gap-quote/:path*",
  ],
};
