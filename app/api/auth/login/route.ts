import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserByAuthId } from "@/lib/data";
import { getDefaultRouteForDepartments } from "@/lib/department-routing";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ success: false, error: "Email and password required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }

  const user = await getUserByAuthId(data.user.id);
  if (!user) {
    await supabase.auth.signOut();
    return NextResponse.json({ success: false, error: "No app profile found for this user" }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    data: {
      role: user.role,
      name: user.name,
      destination: getDefaultRouteForDepartments(user.departments ?? []),
    },
  });
}
