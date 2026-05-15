import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFiles(baseDir) {
  const files = [".env.local", ".env"];
  for (const file of files) {
    const filePath = path.join(baseDir, file);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function readJsonArray(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  loadEnvFiles(process.cwd());

  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const importUserPassword = process.env.IMPORT_USER_PASSWORD || "password";

  const baseDir = process.cwd();
  const dataDir = path.join(baseDir, "data");
  const users = readJsonArray(path.join(dataDir, "users.json"));
  const pages = readJsonArray(path.join(dataDir, "pages.json"));
  const prompts = readJsonArray(path.join(dataDir, "prompts.json"));

  const supabase = createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Upsert non-auth tables first.
  if (pages.length > 0) {
    const { error } = await supabase.from("pages").upsert(
      pages.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description ?? "",
        variables: p.variables ?? [],
      })),
      { onConflict: "id" }
    );
    if (error) throw error;
  }

  if (prompts.length > 0) {
    const { error } = await supabase.from("prompts").upsert(
      prompts.map((p) => ({
        id: p.id,
        name: p.name,
        page_slug: p.pageSlug,
        template: p.template,
        created_at: p.createdAt ?? new Date().toISOString(),
        updated_at: p.updatedAt ?? new Date().toISOString(),
      })),
      { onConflict: "id" }
    );
    if (error) throw error;
  }

  const existing = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (existing.error) throw existing.error;
  const authUsersByEmail = new Map(
    existing.data.users
      .filter((u) => !!u.email)
      .map((u) => [String(u.email).toLowerCase(), u])
  );

  // Users must exist in auth.users before public.users can be inserted.
  for (const user of users) {
    const emailKey = String(user.email).toLowerCase();
    let authUser = authUsersByEmail.get(emailKey);
    if (!authUser) {
      const createRes = await supabase.auth.admin.createUser({
        email: user.email,
        password: importUserPassword,
        email_confirm: true,
        user_metadata: { name: user.name },
      });
      if (createRes.error) throw createRes.error;
      authUser = createRes.data.user;
      if (authUser?.email) {
        authUsersByEmail.set(String(authUser.email).toLowerCase(), authUser);
      }
    }

    if (!authUser?.id) {
      throw new Error(`Unable to create/find auth user for ${user.email}`);
    }

    const { error } = await supabase.from("users").upsert(
      {
        id: user.id,
        auth_user_id: authUser.id,
        name: user.name,
        email: user.email,
        role: user.role === "admin" ? "admin" : "user",
        allowed_pages: Array.isArray(user.allowedPages) ? user.allowedPages : [],
        departments: Array.isArray(user.departments)
          ? user.departments.filter((dept) => dept === "P&C" || dept === "Benefits")
          : [],
      },
      { onConflict: "id" }
    );
    if (error) throw error;
  }

  console.log(`Imported ${users.length} users, ${pages.length} pages, and ${prompts.length} prompts.`);
  console.log(
    "Users were created with IMPORT_USER_PASSWORD (or default 'password'). Plan a password reset flow before production if needed."
  );
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
