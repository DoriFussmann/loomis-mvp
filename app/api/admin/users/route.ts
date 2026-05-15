import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/lib/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const users = await getUsers();
  return NextResponse.json({ success: true, data: users });
}

export async function POST(request: NextRequest) {
  const { name, email, password, role, allowedPages, departments } = await request.json();
  if (!name || !email || !password) {
    return NextResponse.json({ success: false, error: "name, email, password required" }, { status: 400 });
  }
  const users = await getUsers();
  if (users.find((u) => u.email === email)) {
    return NextResponse.json({ success: false, error: "Email already exists" }, { status: 409 });
  }

  const safeRole = role === "admin" ? "admin" : "user";
  const safeAllowedPages = Array.isArray(allowedPages) ? allowedPages : [];
  const safeDepartments = Array.isArray(departments)
    ? departments.filter((dept) => dept === "P&C" || dept === "Benefits")
    : [];
  const supabase = createSupabaseAdminClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (authError || !authData.user?.id) {
    return NextResponse.json({ success: false, error: authError?.message ?? "Unable to create auth user" }, { status: 400 });
  }

  const newUser = {
    id: uuidv4(),
    auth_user_id: authData.user.id,
    name,
    email,
    role: safeRole,
    allowed_pages: safeAllowedPages,
    departments: safeDepartments,
  };

  const { error: profileError } = await supabase.from("users").insert(newUser);
  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ success: false, error: profileError.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        id: newUser.id,
        authUserId: newUser.auth_user_id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        allowedPages: newUser.allowed_pages,
        departments: newUser.departments,
      },
    },
    { status: 201 }
  );
}
