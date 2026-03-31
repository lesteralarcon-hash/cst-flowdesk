import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM GlobalSetting`);
    const cfg: Record<string, string> = {};
    settings.forEach(s => { cfg[s.key] = s.value; });

    return NextResponse.json({
      primaryProvider: cfg.primaryProvider || "groq",
      ollamaEndpoint: cfg.ollamaEndpoint || "http://localhost:11434",
      ollamaModel: cfg.ollamaModel || "llama3.2",
      groqApiKey: cfg.groqApiKey || "",
      geminiApiKey: cfg.geminiApiKey || "",
      anthropicApiKey: cfg.anthropicApiKey || "",
      smtpHost: cfg.smtpHost || "",
      smtpPort: cfg.smtpPort || "",
      smtpSecure: cfg.smtpSecure === "true",
      smtpUser: cfg.smtpUser || "",
      smtpPass: cfg.smtpPass || "",
      smtpFrom: cfg.smtpFrom || "",
    });
  } catch (err) {
    return NextResponse.json({
      primaryProvider: "groq",
      ollamaEndpoint: "http://localhost:11434",
      ollamaModel: "llama3.2",
      groqApiKey: "",
      geminiApiKey: "",
      anthropicApiKey: "",
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Keep legacy apiKey in sync with the active provider key
    if (body.primaryProvider === "groq" && body.groqApiKey) body.apiKey = body.groqApiKey;
    else if (body.primaryProvider === "gemini" && body.geminiApiKey) body.apiKey = body.geminiApiKey;
    else if (body.primaryProvider === "claude" && body.anthropicApiKey) body.apiKey = body.anthropicApiKey;

    for (const [key, val] of Object.entries(body)) {
      if (val !== undefined && val !== null) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO GlobalSetting (id, [key], value) VALUES (?, ?, ?) 
           ON CONFLICT([key]) DO UPDATE SET value = excluded.value`,
          `set_${key}_${Math.random().toString(36).substring(7)}`, 
          key, 
          String(val)
        );
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save settings", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
