import { NextRequest, NextResponse } from "next/server";
import { getPages, savePages } from "@/lib/data";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const pages = getPages();
  const page = pages.find((p) => p.id === params.id);
  if (!page) return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: page });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const pages = getPages();
  const idx = pages.findIndex((p) => p.id === params.id);
  if (idx === -1) return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });
  pages[idx] = { ...pages[idx], ...body, id: params.id };
  savePages(pages);
  return NextResponse.json({ success: true, data: pages[idx] });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const pages = getPages();
  const filtered = pages.filter((p) => p.id !== params.id);
  if (filtered.length === pages.length) {
    return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });
  }
  savePages(filtered);
  return NextResponse.json({ success: true });
}
