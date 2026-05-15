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
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function readJsonArray(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function main() {
  loadEnvFiles(process.cwd());

  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const dataDir = path.join(process.cwd(), "data");
  const localUsers = readJsonArray(path.join(dataDir, "users.json"));
  const localPages = readJsonArray(path.join(dataDir, "pages.json"));
  const localPrompts = readJsonArray(path.join(dataDir, "prompts.json"));

  const [usersRes, pagesRes, promptsRes] = await Promise.all([
    supabase.from("users").select("id,email,role,allowed_pages,departments"),
    supabase.from("pages").select("id,slug"),
    supabase.from("prompts").select("id,page_slug"),
  ]);

  if (usersRes.error) throw usersRes.error;
  if (pagesRes.error) throw pagesRes.error;
  if (promptsRes.error) throw promptsRes.error;

  const dbUsers = usersRes.data ?? [];
  const dbPages = pagesRes.data ?? [];
  const dbPrompts = promptsRes.data ?? [];

  const localUserIds = new Set(localUsers.map((u) => u.id));
  const localPageIds = new Set(localPages.map((p) => p.id));
  const localPromptIds = new Set(localPrompts.map((p) => p.id));
  const dbUserIds = new Set(dbUsers.map((u) => u.id));
  const dbPageIds = new Set(dbPages.map((p) => p.id));
  const dbPromptIds = new Set(dbPrompts.map((p) => p.id));

  const missingUsers = [...localUserIds].filter((id) => !dbUserIds.has(id));
  const missingPages = [...localPageIds].filter((id) => !dbPageIds.has(id));
  const missingPrompts = [...localPromptIds].filter((id) => !dbPromptIds.has(id));

  const result = {
    counts: {
      local: { users: localUsers.length, pages: localPages.length, prompts: localPrompts.length },
      db: { users: dbUsers.length, pages: dbPages.length, prompts: dbPrompts.length },
    },
    missing: {
      users: missingUsers,
      pages: missingPages,
      prompts: missingPrompts,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  if (missingUsers.length || missingPages.length || missingPrompts.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Parity verification failed:", error);
  process.exit(1);
});
