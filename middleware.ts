import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";

function redirectToLogin(request: NextRequest): NextResponse {
  const login = new URL("/login", request.url);
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (next && next !== "/login") {
    login.searchParams.set("next", next);
  }
  return NextResponse.redirect(login);
}

function isGapQuotePage(pathname: string): boolean {
  return pathname === "/gap-quote" || pathname.startsWith("/gap-quote/");
}

function isGapQuoteInboundWebhook(pathname: string): boolean {
  return pathname === "/api/gap-quote/inbound" || pathname.startsWith("/api/gap-quote/inbound/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // SendGrid webhook: authenticated by GAP_QUOTE_INBOUND_WEBHOOK_SECRET in the route, not a session.
  if (isGapQuoteInboundWebhook(pathname)) {
    return NextResponse.next({ request });
  }

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
      return redirectToLogin(request);
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
    isGapQuotePage(pathname)
  ) {
    if (!user) {
      return redirectToLogin(request);
    }
    if (role === "admin") return response;
    if (pathname === "/pnc" && !departments.includes("P&C")) {
      return redirectToLogin(request);
    }
    if (
      (pathname === "/benefits" ||
        pathname === "/employer-application" ||
        pathname === "/claims-validation" ||
        isGapQuotePage(pathname)) &&
      !departments.includes("Benefits")
    ) {
      return redirectToLogin(request);
    }
    return response;
  }

  // Protected user pages (add slugs here as you add pages)
  const protectedPages = ["/test", "/loss-run-analyzer"];
  if (protectedPages.includes(pathname)) {
    if (!user) {
      return redirectToLogin(request);
    }
    // Admin can access everything
    if (role === "admin") return response;
    // Users need page in their allowedPages
    const slug = pathname.replace("/", "");
    if (!allowedPages.includes(slug)) {
      return redirectToLogin(request);
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
    "/gap-quote/:path*",
    "/api/employer-application/:path*",
    "/api/claims-validation/:path*",
    "/api/gap-quote/((?!inbound).*)",
  ],
};
