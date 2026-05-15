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

async function main() {
  loadEnvFiles(process.cwd());
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const updates = [
    { email: "admin@admin.com", departments: ["P&C", "Benefits"] },
    { email: "user@example.com", departments: ["P&C"] },
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from("users")
      .update({ departments: update.departments })
      .ilike("email", update.email);

    if (error) throw error;
  }

  // Ensure there is a benefits-only demo user.
  const benefitsEmail = "benefits@example.com";
  const { data: existingAuthUsers, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  let authUser = existingAuthUsers.users.find((u) => u.email?.toLowerCase() === benefitsEmail);
  if (!authUser) {
    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email: benefitsEmail,
      password: "password",
      email_confirm: true,
      user_metadata: { name: "Benefits User" },
    });
    if (createError) throw createError;
    authUser = createdUser.user ?? undefined;
  } else {
    const { error: updatePasswordError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: "password",
      user_metadata: { name: "Benefits User" },
    });
    if (updatePasswordError) throw updatePasswordError;
  }

  if (!authUser?.id) {
    throw new Error("Could not create or retrieve benefits@example.com auth user");
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();
  if (existingProfileError) throw existingProfileError;

  if (existingProfile?.id) {
    const { error: updateProfileError } = await supabase
      .from("users")
      .update({
        name: "Benefits User",
        email: benefitsEmail,
        role: "user",
        allowed_pages: [],
        departments: ["Benefits"],
      })
      .eq("id", existingProfile.id);
    if (updateProfileError) throw updateProfileError;
  } else {
    const { error: insertProfileError } = await supabase.from("users").insert({
      id: authUser.id,
      auth_user_id: authUser.id,
      name: "Benefits User",
      email: benefitsEmail,
      role: "user",
      allowed_pages: [],
      departments: ["Benefits"],
    });
    if (insertProfileError) throw insertProfileError;
  }

  console.log("Seeded departments and ensured benefits@example.com demo user exists.");
}

main().catch((error) => {
  console.error("Department seeding failed:", error);
  process.exit(1);
});
