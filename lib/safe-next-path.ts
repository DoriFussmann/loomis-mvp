export function safeNextPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("://")) {
    return null;
  }
  const pathname = path.split("?")[0] ?? path;
  const allowed = [
    "/gap-quote",
    "/benefits",
    "/pnc",
    "/admin",
    "/employer-application",
    "/claims-validation",
    "/loss-run-analyzer",
    "/test",
  ];
  const matched = allowed.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return matched ? path : null;
}
