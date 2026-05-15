import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ClientRecord } from "./schema";

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  dob: string;
  member_id: string;
  insurer_name: string;
}

function toClientRecord(row: ClientRow): ClientRecord {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    dob: row.dob,
    memberId: row.member_id,
    insurerName: row.insurer_name,
  };
}

// Pass 1: strip spaces, dashes, underscores — normalize case.
function normalizeId(value: string): string {
  return value.toUpperCase().replace(/[\s\-_]/g, "").trim();
}

// Pass 2: digits only — handles OCR alpha prefix/suffix noise.
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

function lastNamesMatch(formLastName: string, dbLastName: string): boolean {
  if (!formLastName || !dbLastName) return false;
  return normalizeText(formLastName) === normalizeText(dbLastName);
}

function dobsMatch(formDob: string, dbDob: string): boolean {
  if (!formDob || !dbDob) return false;
  const a = formDob.trim();
  const b = dbDob.trim();
  return a === b || b.startsWith(a) || a.startsWith(b);
}

function insurerNamesMatch(formPayer: string, dbInsurer: string): boolean {
  if (!formPayer || !dbInsurer) return false;
  const a = normalizeText(formPayer);
  const b = normalizeText(dbInsurer);
  return a.includes(b) || b.includes(a);
}

export async function matchByMemberId(
  memberId: string,
  payerName: string,
  patientLastName: string,
  patientDob: string
): Promise<{ client: ClientRecord; insurerMatched: boolean; lastNameMatched: boolean; dobMatched: boolean } | null> {
  if (!memberId.trim()) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id,first_name,last_name,dob,member_id,insurer_name");

  if (error || !data || data.length === 0) return null;

  const rows = data as ClientRow[];
  const normalizedInput = normalizeId(memberId);
  const digitsInput = digitsOnly(memberId);

  // Pass 1: normalized exact match
  let matched = rows.find((row) => normalizeId(row.member_id) === normalizedInput);

  // Pass 2: digits-only match
  if (!matched && digitsInput.length >= 4) {
    matched = rows.find((row) => {
      const dbDigits = digitsOnly(row.member_id);
      return dbDigits.length >= 4 && dbDigits === digitsInput;
    });
  }

  if (!matched) return null;

  const client = toClientRecord(matched);

  return {
    client,
    insurerMatched: insurerNamesMatch(payerName, client.insurerName),
    lastNameMatched: lastNamesMatch(patientLastName, client.lastName),
    dobMatched: dobsMatch(patientDob, client.dob),
  };
}

export async function matchByNameAndDob(
  lastName: string,
  dob: string
): Promise<{ client: ClientRecord; matchStep: "name-dob" | "name-no-dob" } | null> {
  if (!lastName.trim()) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id,first_name,last_name,dob,member_id,insurer_name")
    .ilike("last_name", lastName.trim());

  if (error || !data || data.length === 0) return null;

  const rows = data as ClientRow[];

  // Last name found — now require DoB to match
  if (dob.trim()) {
    const normalizedDob = dob.trim();
    const dobMatch = rows.find(
      (row) => row.dob === normalizedDob || row.dob.startsWith(normalizedDob)
    );
    if (dobMatch) {
      return { client: toClientRecord(dobMatch), matchStep: "name-dob" };
    }
  }

  // Last name found but DoB did not match (or was empty) — partial failure
  // Return the first last-name match so the UI can show which record was found
  return { client: toClientRecord(rows[0]), matchStep: "name-no-dob" };
}
