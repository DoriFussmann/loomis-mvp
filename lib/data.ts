import { v4 as uuidv4 } from "uuid";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { User, AppPage, Prompt, Department } from "./types";
import type {
  AnalyzeGapQuoteResult,
  EmailExtractionResult,
  GapQuoteBucketKey,
  GapQuoteCatalog,
  GapQuoteRateRow,
  GapQuoteRun,
  GapQuoteRunSource,
  GapQuoteRunStatus,
  GapQuoteSettings,
  GapQuoteStateBucket,
} from "./gapQuote/schema";

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

interface BucketRow {
  bucket_key: string;
  label: string;
  states: string[] | null;
  lives_min: number;
  lives_max: number;
  sort_order: number;
}

interface RateRow {
  id: string;
  bucket_key: string;
  deductible: number | string;
  benefit: number | string;
  rate_ee_only: number | string;
  rate_ee_spouse: number | string;
  rate_ee_children: number | string;
  rate_family: number | string;
}

interface SettingsRow {
  id: string;
  admin_fee: number | string;
}

function toNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function toBucket(row: BucketRow): GapQuoteStateBucket {
  return {
    bucketKey: row.bucket_key as GapQuoteBucketKey,
    label: row.label,
    states: row.states ?? [],
    livesMin: row.lives_min,
    livesMax: row.lives_max,
    sortOrder: row.sort_order,
  };
}

function toRate(row: RateRow): GapQuoteRateRow {
  return {
    id: row.id,
    bucketKey: row.bucket_key as GapQuoteBucketKey,
    deductible: toNumber(row.deductible),
    benefit: toNumber(row.benefit),
    rateEeOnly: toNumber(row.rate_ee_only),
    rateEeSpouse: toNumber(row.rate_ee_spouse),
    rateEeChildren: toNumber(row.rate_ee_children),
    rateFamily: toNumber(row.rate_family),
  };
}

export async function getGapQuoteBuckets(): Promise<GapQuoteStateBucket[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gap_quote_state_buckets")
    .select("bucket_key,label,states,lives_min,lives_max,sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => toBucket(row as BucketRow));
}

export async function getGapQuoteRates(): Promise<GapQuoteRateRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gap_quote_rates")
    .select("id,bucket_key,deductible,benefit,rate_ee_only,rate_ee_spouse,rate_ee_children,rate_family")
    .order("deductible", { ascending: true })
    .order("benefit", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => toRate(row as RateRow));
}

export async function getGapQuoteSettings(): Promise<GapQuoteSettings> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gap_quote_settings")
    .select("id,admin_fee")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw error;
  if (!data) return { id: "default", adminFee: 0 };
  const row = data as SettingsRow;
  return { id: row.id, adminFee: toNumber(row.admin_fee) };
}

export async function getGapQuoteCatalog(): Promise<GapQuoteCatalog> {
  const [buckets, rates, settings] = await Promise.all([
    getGapQuoteBuckets(),
    getGapQuoteRates(),
    getGapQuoteSettings(),
  ]);
  return { buckets, rates, settings };
}

export async function saveGapQuoteSettings(adminFee: number): Promise<GapQuoteSettings> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gap_quote_settings")
    .upsert({ id: "default", admin_fee: adminFee }, { onConflict: "id" })
    .select("id,admin_fee")
    .single();
  if (error) throw error;
  const row = data as SettingsRow;
  return { id: row.id, adminFee: toNumber(row.admin_fee) };
}

export async function replaceGapQuoteCatalog(input: {
  buckets: GapQuoteStateBucket[];
  rates: GapQuoteRateRow[];
}): Promise<GapQuoteCatalog> {
  const supabase = createSupabaseAdminClient();

  const { error: rateDeleteError } = await supabase.from("gap_quote_rates").delete().neq("id", "");
  if (rateDeleteError) throw rateDeleteError;

  const bucketPayload = input.buckets.map((bucket) => ({
    bucket_key: bucket.bucketKey,
    label: bucket.label,
    states: bucket.states,
    lives_min: bucket.livesMin,
    lives_max: bucket.livesMax,
    sort_order: bucket.sortOrder,
  }));
  const { error: bucketError } = await supabase
    .from("gap_quote_state_buckets")
    .upsert(bucketPayload, { onConflict: "bucket_key" });
  if (bucketError) throw bucketError;

  const ratePayload = input.rates.map((rate) => ({
    id: rate.id,
    bucket_key: rate.bucketKey,
    deductible: rate.deductible,
    benefit: rate.benefit,
    rate_ee_only: rate.rateEeOnly,
    rate_ee_spouse: rate.rateEeSpouse,
    rate_ee_children: rate.rateEeChildren,
    rate_family: rate.rateFamily,
  }));
  if (ratePayload.length > 0) {
    const { error: rateError } = await supabase.from("gap_quote_rates").insert(ratePayload);
    if (rateError) throw rateError;
  }

  return getGapQuoteCatalog();
}

export async function createGapQuoteRate(
  rate: Omit<GapQuoteRateRow, "id"> & { id?: string }
): Promise<GapQuoteRateRow> {
  const supabase = createSupabaseAdminClient();
  const id = rate.id ?? uuidv4();
  const { data, error } = await supabase
    .from("gap_quote_rates")
    .insert({
      id,
      bucket_key: rate.bucketKey,
      deductible: rate.deductible,
      benefit: rate.benefit,
      rate_ee_only: rate.rateEeOnly,
      rate_ee_spouse: rate.rateEeSpouse,
      rate_ee_children: rate.rateEeChildren,
      rate_family: rate.rateFamily,
    })
    .select("id,bucket_key,deductible,benefit,rate_ee_only,rate_ee_spouse,rate_ee_children,rate_family")
    .single();
  if (error) throw error;
  return toRate(data as RateRow);
}

export async function updateGapQuoteRate(
  id: string,
  patch: Partial<Omit<GapQuoteRateRow, "id">>
): Promise<GapQuoteRateRow> {
  const supabase = createSupabaseAdminClient();
  const payload: Record<string, unknown> = {};
  if (patch.bucketKey !== undefined) payload.bucket_key = patch.bucketKey;
  if (patch.deductible !== undefined) payload.deductible = patch.deductible;
  if (patch.benefit !== undefined) payload.benefit = patch.benefit;
  if (patch.rateEeOnly !== undefined) payload.rate_ee_only = patch.rateEeOnly;
  if (patch.rateEeSpouse !== undefined) payload.rate_ee_spouse = patch.rateEeSpouse;
  if (patch.rateEeChildren !== undefined) payload.rate_ee_children = patch.rateEeChildren;
  if (patch.rateFamily !== undefined) payload.rate_family = patch.rateFamily;

  const { data, error } = await supabase
    .from("gap_quote_rates")
    .update(payload)
    .eq("id", id)
    .select("id,bucket_key,deductible,benefit,rate_ee_only,rate_ee_spouse,rate_ee_children,rate_family")
    .single();
  if (error) throw error;
  return toRate(data as RateRow);
}

export async function deleteGapQuoteRate(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("gap_quote_rates").delete().eq("id", id);
  if (error) throw error;
}

interface GapQuoteRunRow {
  id: string;
  created_at: string;
  updated_at: string;
  source: string;
  status: string;
  sender_email: string;
  subject: string;
  inbound_message_id: string | null;
  extract: unknown;
  result: unknown;
  error_message: string | null;
  reply_sent_at: string | null;
}

function toGapQuoteRun(row: GapQuoteRunRow): GapQuoteRun {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: row.source as GapQuoteRunSource,
    status: row.status as GapQuoteRunStatus,
    senderEmail: row.sender_email ?? "",
    subject: row.subject ?? "",
    inboundMessageId: row.inbound_message_id ?? "",
    extract: (row.extract as EmailExtractionResult | null) ?? null,
    result: (row.result as AnalyzeGapQuoteResult | null) ?? null,
    errorMessage: row.error_message ?? "",
    replySentAt: row.reply_sent_at,
  };
}

const GAP_QUOTE_RUN_SELECT =
  "id,created_at,updated_at,source,status,sender_email,subject,inbound_message_id,extract,result,error_message,reply_sent_at";

export async function createGapQuoteRun(input: {
  id?: string;
  source: GapQuoteRunSource;
  status: GapQuoteRunStatus;
  senderEmail?: string;
  subject?: string;
  inboundMessageId?: string;
  extract?: EmailExtractionResult | null;
  result?: AnalyzeGapQuoteResult | null;
  errorMessage?: string;
}): Promise<GapQuoteRun> {
  const supabase = createSupabaseAdminClient();
  const id = input.id ?? uuidv4();
  const { data, error } = await supabase
    .from("gap_quote_runs")
    .insert({
      id,
      source: input.source,
      status: input.status,
      sender_email: input.senderEmail ?? "",
      subject: input.subject ?? "",
      inbound_message_id: input.inboundMessageId || null,
      extract: input.extract ?? null,
      result: input.result ?? null,
      error_message: input.errorMessage ?? "",
    })
    .select(GAP_QUOTE_RUN_SELECT)
    .single();
  if (error) throw error;
  return toGapQuoteRun(data as GapQuoteRunRow);
}

export async function getGapQuoteRun(id: string): Promise<GapQuoteRun | undefined> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gap_quote_runs")
    .select(GAP_QUOTE_RUN_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toGapQuoteRun(data as GapQuoteRunRow) : undefined;
}

export async function getGapQuoteRunByMessageId(messageId: string): Promise<GapQuoteRun | undefined> {
  if (!messageId) return undefined;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gap_quote_runs")
    .select(GAP_QUOTE_RUN_SELECT)
    .eq("inbound_message_id", messageId)
    .maybeSingle();
  if (error) throw error;
  return data ? toGapQuoteRun(data as GapQuoteRunRow) : undefined;
}

export async function updateGapQuoteRun(
  id: string,
  patch: {
    status?: GapQuoteRunStatus;
    extract?: EmailExtractionResult | null;
    result?: AnalyzeGapQuoteResult | null;
    errorMessage?: string;
    replySentAt?: string | null;
  }
): Promise<GapQuoteRun> {
  const supabase = createSupabaseAdminClient();
  const payload: Record<string, unknown> = {};
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.extract !== undefined) payload.extract = patch.extract;
  if (patch.result !== undefined) payload.result = patch.result;
  if (patch.errorMessage !== undefined) payload.error_message = patch.errorMessage;
  if (patch.replySentAt !== undefined) payload.reply_sent_at = patch.replySentAt;

  const { data, error } = await supabase
    .from("gap_quote_runs")
    .update(payload)
    .eq("id", id)
    .select(GAP_QUOTE_RUN_SELECT)
    .single();
  if (error) throw error;
  return toGapQuoteRun(data as GapQuoteRunRow);
}
