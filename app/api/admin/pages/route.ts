import { NextRequest, NextResponse } from "next/server";
import { getPages, savePages } from "@/lib/data";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  return NextResponse.json({ success: true, data: getPages() });
}

export async function POST(request: NextRequest) {
  const { name, slug, description, variables } = await request.json();
  if (!name || !slug) {
    return NextResponse.json({ success: false, error: "name and slug required" }, { status: 400 });
  }
  const pages = getPages();
  if (pages.find((p) => p.slug === slug)) {
    return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 409 });
  }
  const page = { id: uuidv4(), name, slug, description: description ?? "", variables: variables ?? [] };
  savePages([...pages, page]);
  return NextResponse.json({ success: true, data: page }, { status: 201 });
}
