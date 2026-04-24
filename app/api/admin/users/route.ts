import { NextRequest, NextResponse } from "next/server";
import { getUsers, saveUsers } from "@/lib/data";
import { hashPassword } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const users = getUsers().map(({ passwordHash: _, ...u }) => u);
  return NextResponse.json({ success: true, data: users });
}

export async function POST(request: NextRequest) {
  const { name, email, password, role, allowedPages } = await request.json();
  if (!name || !email || !password) {
    return NextResponse.json({ success: false, error: "name, email, password required" }, { status: 400 });
  }
  const users = getUsers();
  if (users.find((u) => u.email === email)) {
    return NextResponse.json({ success: false, error: "Email already exists" }, { status: 409 });
  }
  const newUser = {
    id: uuidv4(),
    name,
    email,
    passwordHash: hashPassword(password),
    role: role ?? "user",
    allowedPages: allowedPages ?? [],
  };
  saveUsers([...users, newUser]);
  const { passwordHash: _, ...safe } = newUser;
  return NextResponse.json({ success: true, data: safe }, { status: 201 });
}
