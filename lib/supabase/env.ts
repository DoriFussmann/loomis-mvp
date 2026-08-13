function readEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function normalizeSupabaseUrl(raw: string): string {
  try {
    const parsed = new URL(raw.trim());
    parsed.pathname = "/";
    parsed.search = "";
    parsed.hash = "";
    return parsed.origin;
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be the project origin, e.g. https://<project-ref>.supabase.co");
  }
}

export function getSupabaseUrl(): string {
  return normalizeSupabaseUrl(readEnv("NEXT_PUBLIC_SUPABASE_URL"));
}

export function getSupabaseAnonKey(): string {
  return readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseServiceRoleKey(): string {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY");
}
