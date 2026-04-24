import { NextRequest, NextResponse } from "next/server";
import { getPrompts, savePrompts } from "@/lib/data";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  return NextResponse.json({ success: true, data: getPrompts() });
}

export async function POST(request: NextRequest) {
  const { name, pageSlug, template } = await request.json();
  if (!name || !pageSlug || !template) {
    return NextResponse.json({ success: false, error: "name, pageSlug, template required" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const prompt = { id: uuidv4(), name, pageSlug, template, createdAt: now, updatedAt: now };
  savePrompts([...getPrompts(), prompt]);
  return NextResponse.json({ success: true, data: prompt }, { status: 201 });
}
