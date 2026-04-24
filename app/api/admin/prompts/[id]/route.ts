import { NextRequest, NextResponse } from "next/server";
import { getPrompts, savePrompts } from "@/lib/data";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const prompts = getPrompts();
  const prompt = prompts.find((p) => p.id === params.id);
  if (!prompt) return NextResponse.json({ success: false, error: "Prompt not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: prompt });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const prompts = getPrompts();
  const idx = prompts.findIndex((p) => p.id === params.id);
  if (idx === -1) return NextResponse.json({ success: false, error: "Prompt not found" }, { status: 404 });
  prompts[idx] = { ...prompts[idx], ...body, id: params.id, updatedAt: new Date().toISOString() };
  savePrompts(prompts);
  return NextResponse.json({ success: true, data: prompts[idx] });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const prompts = getPrompts();
  const filtered = prompts.filter((p) => p.id !== params.id);
  if (filtered.length === prompts.length) {
    return NextResponse.json({ success: false, error: "Prompt not found" }, { status: 404 });
  }
  savePrompts(filtered);
  return NextResponse.json({ success: true });
}
