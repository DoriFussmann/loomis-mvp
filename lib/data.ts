import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { User, AppPage, Prompt, Department } from "./types";

interface UserRow {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  allowed_pages: string[] | null;
  departments: string[] | null;
}

interface PageRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  variables: unknown;
}

interface PromptRow {
  id: string;
  name: string;
  page_slug: string;
  template: string;
  created_at: string;
  updated_at: string;
}

function toUser(row: UserRow): User {
  const departments = Array.isArray(row.departments)
    ? row.departments.filter((dept): dept is Department => dept === "P&C" || dept === "Benefits")
    : [];

  return {
    id: row.id,
    authUserId: row.auth_user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    allowedPages: row.allowed_pages ?? [],
    departments,
  };
}

function toPage(row: PageRow): AppPage {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    variables: Array.isArray(row.variables) ? (row.variables as AppPage["variables"]) : [],
  };
}

function toPrompt(row: PromptRow): Prompt {
  return {
    id: row.id,
    name: row.name,
    pageSlug: row.page_slug,
    template: row.template,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function deleteMissingById(table: "users" | "pages" | "prompts", ids: string[]): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).select("id");
  if (error) throw error;

  const existingIds = (data ?? []).map((row: { id: string }) => row.id);
  const staleIds = existingIds.filter((id) => !ids.includes(id));
  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase.from(table).delete().in("id", staleIds);
    if (deleteError) throw deleteError;
  }
}

// Users
export async function getUsers(): Promise<User[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id,auth_user_id,name,email,role,allowed_pages,departments")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => toUser(row as UserRow));
}

export async function saveUsers(users: User[]): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const payload = users.map((user) => ({
    id: user.id,
    auth_user_id: user.authUserId,
    name: user.name,
    email: user.email,
    role: user.role,
    allowed_pages: user.allowedPages ?? [],
    departments: user.departments ?? [],
  }));

  await deleteMissingById(
    "users",
    users.map((user) => user.id)
  );

  if (payload.length === 0) return;
  const { error } = await supabase.from("users").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id,auth_user_id,name,email,role,allowed_pages,departments")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toUser(data as UserRow) : undefined;
}

export async function getUserByAuthId(authUserId: string): Promise<User | undefined> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id,auth_user_id,name,email,role,allowed_pages,departments")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw error;
  return data ? toUser(data as UserRow) : undefined;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id,auth_user_id,name,email,role,allowed_pages,departments")
    .ilike("email", email)
    .maybeSingle();

  if (error) throw error;
  return data ? toUser(data as UserRow) : undefined;
}

// Pages
export async function getPages(): Promise<AppPage[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id,name,slug,description,variables")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => toPage(row as PageRow));
}

export async function savePages(pages: AppPage[]): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await deleteMissingById(
    "pages",
    pages.map((page) => page.id)
  );

  if (pages.length === 0) return;
  const payload = pages.map((page) => ({
    id: page.id,
    name: page.name,
    slug: page.slug,
    description: page.description ?? "",
    variables: page.variables ?? [],
  }));
  const { error } = await supabase.from("pages").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function getPageBySlug(slug: string): Promise<AppPage | undefined> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id,name,slug,description,variables")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data ? toPage(data as PageRow) : undefined;
}

// Prompts
export async function getPrompts(): Promise<Prompt[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("prompts")
    .select("id,name,page_slug,template,created_at,updated_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => toPrompt(row as PromptRow));
}

export async function savePrompts(prompts: Prompt[]): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await deleteMissingById(
    "prompts",
    prompts.map((prompt) => prompt.id)
  );

  if (prompts.length === 0) return;
  const payload = prompts.map((prompt) => ({
    id: prompt.id,
    name: prompt.name,
    page_slug: prompt.pageSlug,
    template: prompt.template,
    created_at: prompt.createdAt,
    updated_at: prompt.updatedAt,
  }));
  const { error } = await supabase.from("prompts").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function getPromptById(id: string): Promise<Prompt | undefined> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("prompts")
    .select("id,name,page_slug,template,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toPrompt(data as PromptRow) : undefined;
}

export async function getPromptsByPage(slug: string): Promise<Prompt[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("prompts")
    .select("id,name,page_slug,template,created_at,updated_at")
    .eq("page_slug", slug)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => toPrompt(row as PromptRow));
}
