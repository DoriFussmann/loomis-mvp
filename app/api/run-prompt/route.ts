import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getPromptById, getPageBySlug } from "@/lib/data";
import { interpolatePrompt } from "@/lib/prompts";
import { getSession } from "@/lib/auth";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { promptId, variables } = await request.json();
  if (!promptId || !variables) {
    return NextResponse.json({ success: false, error: "promptId and variables required" }, { status: 400 });
  }

  const prompt = getPromptById(promptId);
  if (!prompt) {
    return NextResponse.json({ success: false, error: "Prompt not found" }, { status: 404 });
  }

  // Check user has access to this page
  if (session.role !== "admin") {
    const allowedPages = (session as { allowedPages?: string[] }).allowedPages ?? [];
    if (!allowedPages.includes(prompt.pageSlug)) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }
  }

  // Validate all required variables are provided
  const page = getPageBySlug(prompt.pageSlug);
  if (page) {
    const missingVars = page.variables
      .map((v) => v.name)
      .filter((name) => !variables[name] || !variables[name].trim());
    if (missingVars.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing variables: ${missingVars.join(", ")}` },
        { status: 400 }
      );
    }
  }

  const resolvedPrompt = interpolatePrompt(prompt.template, variables);

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: resolvedPrompt }],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  return NextResponse.json({ success: true, data: { result: text } });
}
