import { NextRequest, NextResponse } from "next/server";
import { getUsers, saveUsers } from "@/lib/data";
import { hashPassword } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const users = getUsers();
  const user = users.find((u) => u.id === params.id);
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  const { passwordHash: _pw, ...safe } = user;
  return NextResponse.json({ success: true, data: safe });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { name, email, password, role, allowedPages } = await request.json();
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === params.id);
  if (idx === -1) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  users[idx] = {
    ...users[idx],
    ...(name && { name }),
    ...(email && { email }),
    ...(password && { passwordHash: hashPassword(password) }),
    ...(role && { role }),
    ...(allowedPages !== undefined && { allowedPages }),
  };
  saveUsers(users);
  const { passwordHash: _, ...safe } = users[idx];
  return NextResponse.json({ success: true, data: safe });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const users = getUsers();
  const filtered = users.filter((u) => u.id !== params.id);
  if (filtered.length === users.length) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }
  saveUsers(filtered);
  return NextResponse.json({ success: true });
}
