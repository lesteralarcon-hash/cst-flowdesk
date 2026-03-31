import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function run() {
  const res = await client.execute(`SELECT * FROM GlobalSetting`);
  const raw = {};
  res.rows.forEach(r => { raw[r[1]] = r[2]; });
  console.log("Global Settings retrieved:", Object.keys(raw));
  console.log("Primary Provider:", raw.primaryProvider);
  console.log("Gemini Key Exists:", !!raw.geminiApiKey);
  console.log("Groq Key Exists:", !!raw.groqApiKey);
}
run();
