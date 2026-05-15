import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/lib/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserById(params.id);
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: user });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { name, email, password, role, allowedPages, departments } = await request.json();
  const existing = await getUserById(params.id);
  if (!existing || !existing.authUserId) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const authUpdate: { email?: string; password?: string; user_metadata?: Record<string, string> } = {};
  if (email && email !== existing.email) authUpdate.email = email;
  if (password && String(password).trim()) authUpdate.password = password;
  if (name && name !== existing.name) authUpdate.user_metadata = { name };

  if (Object.keys(authUpdate).length > 0) {
    const { error: authError } = await supabase.auth.admin.updateUserById(existing.authUserId, authUpdate);
    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
    }
  }

  const profileUpdate = {
    name: name ?? existing.name,
    email: email ?? existing.email,
    role: role === "admin" ? "admin" : role === "user" ? "user" : existing.role,
    allowed_pages: Array.isArray(allowedPages) ? allowedPages : existing.allowedPages,
    departments: Array.isArray(departments)
      ? departments.filter((dept) => dept === "P&C" || dept === "Benefits")
      : existing.departments,
  };

  const { data, error } = await supabase
    .from("users")
    .update(profileUpdate)
    .eq("id", params.id)
    .select("id,auth_user_id,name,email,role,allowed_pages,departments")
    .single();
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: data.id,
      authUserId: data.auth_user_id,
      name: data.name,
      email: data.email,
      role: data.role,
      allowedPages: data.allowed_pages ?? [],
      departments: data.departments ?? [],
    },
  });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const existing = await getUserById(params.id);
  if (!existing || !existing.authUserId) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const { error: authError } = await supabase.auth.admin.deleteUser(existing.authUserId);
  if (authError) {
    return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
