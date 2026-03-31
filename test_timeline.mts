import { getModelForApp } from "./src/lib/ai.ts";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  try {
    const model = await getModelForApp("timeline");
    console.log("Got model for timeline!");
    
    const timelineInstruction = "You are an expert... output JSON";
    const userPrompt = "Tasks: [{...}]";
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: { role: "system", parts: [{ text: timelineInstruction }] },
      generationConfig: {
         temperature: 0.1
      }
    });

    console.log(result.response.text());
  } catch(e) {
    console.error("Timeline Generation Error:", e);
  }
}
run();
