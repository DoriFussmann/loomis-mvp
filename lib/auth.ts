import type { SessionPayload } from "./types";
import { getUserByAuthId } from "./data";
import { createServerSupabaseClient } from "./supabase/server";

const COOKIE_NAME = "sb-access-token";

export async function getSession(): Promise<SessionPayload | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  const appUser = await getUserByAuthId(user.id);
  if (!appUser) return null;

  return {
    id: appUser.id,
    name: appUser.name,
    email: appUser.email,
    role: appUser.role,
    allowedPages: appUser.allowedPages ?? [],
    departments: appUser.departments ?? [],
  };
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
