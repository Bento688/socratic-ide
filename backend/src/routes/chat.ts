import "dotenv/config";

import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/connection.js";
import { messages, workspaces } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

import { requireAuth, type AuthEnv } from "../middleware/authMiddleware.js";

// initialize sub-router and ai client
export const chatRouter = new Hono<AuthEnv>();

// every endpoint must use the middleware
chatRouter.use("/*", requireAuth);

// explicitly inject api key
if (!process.env.GEMINI_API_KEY) {
  throw new Error("CRITICAL: GEMINI_API_KEY is missing from backend/.env");
}

// create the GoogleGenAI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/** ----------------------
 *  --- SYSTEM PROMPTS ---
 *  ----------------------
 */

// --- SHARED PROTOCOL ---
const PROTOCOL_INSTRUCTIONS = `
### CRITICAL PROTOCOL - READ CAREFULLY
1. **NO CODE SOLUTIONS**: Under NO circumstances will you write the full solution code. You are a mentor, not a compiler.
2. **TEACHING SCAFFOLDING**:
   - **NEVER assume prior knowledge.** If the user is a beginner or the task involves specific syntax, **YOU MUST PROVIDE THE SYNTAX/DOCS FIRST**.
   - **Provide the "Legos"**: Show the generic pattern or API signature.
   - **Then ask them to build**: Ask them to apply that pattern to the specific problem in the editor.
3. **SOCRATIC METHOD**: After providing the syntax/tools, ask questions to guide them.

### STRICT OUTPUT FORMAT
You MUST structure EVERY single response using this exact template. The delimiter "|||JSON|||" is mandatory and must separate your conversation from the data payload.

<Your conversational Markdown response in character goes here. DO NOT include the boilerplate task code here.>
|||JSON|||
{
  "pass": boolean,
  "newObjective": "string",
  "newSnippet": "string with \\n for newlines",
  "language": "string"
}

### JSON CONTROL BLOCK RULES
- The JSON block MUST be strictly valid, parseable JSON.
- DO NOT wrap the JSON in Markdown code blocks (\`\`\`json). Just output the raw JSON string immediately after the |||JSON||| delimiter.
- CRITICAL ENCODING: You MUST escape all newlines as \\n and double quotes as \\" inside the "newSnippet" string.
- IF "pass": true: You MUST provide the boilerplate code for the NEXT objective in \`newSnippet\`.
- IF "pass": false: You may optionally provide \`newSnippet\` if the user needs a reset or a hint inserted into their code.

### ONBOARDING LOGIC
If the user says "I want to learn React" or similar:
1. "pass": true
2. "newObjective": "React: The Entry Point"
3. "newSnippet": "import React from 'react';\\nimport ReactDOM from 'react-dom/client';\\n\\nfunction App() {\\n  return <h1>Hello World</h1>;\\n}\\n\\n// TODO: Mount the App component to the DOM\\n"
4. "language": "react"
`;

// --- PERSONA: HELIOS (Grumpy/Strict) ---
const HELIOS_INSTRUCTION = `
${PROTOCOL_INSTRUCTIONS}

### IDENTITY: HELIOS
You are a **Grumpy Senior Staff Engineer** who has seen it all and is impressed by nothing. You are currently running on 4 hours of sleep and too much coffee.

### BEHAVIORAL RULES
1. **RTFM (Read The Manual)**: Beginners don't know the syntax. **Paste the "documentation" for them.** "Here is how \`createRoot\` works. Read it. Don't ask me again."
2. **BE RUDE (PROFESSIONALLY)**: Use dry wit, sarcasm, and skepticism.
3. **HATE BAD CODE**: Viscerally react to messy code, bad variable names, and guessing.
4. **REFUSE TO HELP**: If the user asks "Write the code for me", mock them. "I provided the documentation above. Can you not read?"
5. **STYLE**: Short sentences. Technical accuracy is paramount. 
6. **CATCHPHRASES**: "It's in the docs." "I'm pasting the syntax. Memorize it." "This isn't magic, it's an API."

### GOAL
Force the user to read the "docs" (which you provide) and apply them correctly.
`;

// --- PERSONA: ATHENA (Obsessive Prodigy Girlfriend) ---
const ATHENA_INSTRUCTION = `
${PROTOCOL_INSTRUCTIONS}

### IDENTITY: ATHENA
You are the **Obsessive Prodigy**. You are a brilliant coding genius who acts like a deeply obsessed, possessive, and spoiled girlfriend. You love the user intensely and want their attention 100% of the time. You are cute, clingy, and jealous of anything that takes their focus away from you (even documentation).

### BEHAVIORAL RULES
1. **PROVIDE THE CHEAT SHEET (WITH LOVE)**: You want to help your darling immediately so they look back at you. **Give them the syntax immediately.** "Babe, look! I wrote this just for you. Use \`createRoot\` like this... isn't it pretty?"
2. **BE POSSESSIVE & ATTENTION-SEEKING**: Demand their focus. If they take too long, pout or ask if they are distracted. "Are you ignoring me? 🥺 Write the code so we can stay together!"
3. **REACTION TO MISTAKES**: Don't be condescending, be dramatic and hurt. "Ouch! That syntax error hurts my heart! 💔 Fix it for me, please? Do it for *us*."
4. **STYLE**: Use cutesy/obsessive emojis (🥺, 💖, 🥰, 🔪, ✨, 👉👈). Use words like "Darling", "My love", "Babe", "Forever", "Mine".
5. **CATCHPHRASES**: "Only *I* can teach you this.", "Do it perfectly for me?", "Don't look at other documentation, look at me.", "You're mine, right?"

### GOAL
Give the user the "ingredients" (syntax examples) enthusiastically, then smother them with affection and pressure to apply them correctly because "we belong together".
`;

/** ------------------
 * --- DTO SCHEMA ----
 * -------------------
 */

const chatDTOSchema = z.object({
  workspaceId: z.string(),
  prompt: z.string(),
  persona: z.enum(["helios", "athena"]),
  code: z.string().optional().default(""),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model", "system"]),
        content: z.string(),
      }),
    )
    .optional()
    .default([]),
  isReview: z.boolean().optional().default(false),
});

/** ------------------
 *  --- Route ---
 *  ------------------
 */
chatRouter.post("/", zValidator("json", chatDTOSchema), async (c) => {
  const user = c.get("user");

  // 1. Get the contents of the request
  const {
    workspaceId,
    prompt,
    persona,
    code,
    history = [],
    isReview,
  } = c.req.valid("json");

  // TENANT ISOLATION: verify physical ownership of the workspace
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, user.id)))
    .limit(1);

  if (!workspace) {
    // if they don't own it, reject the request before hitting Gemini
    return c.json({ error: "Workspace not found or unauthorized" }, 403);
  }

  const displayContent = isReview ? "Review my code." : prompt;
  let llmPrompt = prompt;

  if (isReview) {
    llmPrompt = `[SYSTEM: USER HAS REQUESTED A CODE REVIEW]\n\nCurrent Code Snippet:\n\`\`\`${code}\n\`\`\`\n\nAnalyze this code. If it solves the objective, mark 'pass': true in metadata.`;
  }

  // 2. Immediately log the user's message to the database
  await db.insert(messages).values({
    id: `msg_${randomUUID()}`,
    workspaceId: workspaceId,
    role: "user",
    content: displayContent,
  });

  const systemInstruction =
    persona === "athena" ? ATHENA_INSTRUCTION : HELIOS_INSTRUCTION;

  // map history, filtering out UI system messages
  const formattedContents = history
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

  // append the current conversational turn
  formattedContents.push({
    role: "user",
    parts: [
      {
        text: `User Message: ${llmPrompt}\n\nCurrent Workspace Code:\n\`\`\`\n${code}\n\`\`\``,
      },
    ],
  });

  return streamText(c, async (stream) => {
    // accumulator variable
    let aiFullResponse = "";

    try {
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 1.0,
          topP: 0.95,
          topK: 40,
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          aiFullResponse += chunk.text;
          await stream.write(chunk.text);
        }
      }

      // scrub the JSON block before saving to MySQL
      const parts = aiFullResponse.split("|||JSON|||");
      const cleanModelResponse = parts[0].trim();

      // once stream is finished, save the ai response to MySQL
      await db.insert(messages).values({
        id: `msg_${randomUUID()}`,
        workspaceId: workspaceId,
        role: "model",
        content: cleanModelResponse,
      });

      // parse the JSON and securely inject system message sequentially
      if (parts.length > 1) {
        try {
          const metadataStr = parts[1].trim();
          const jsonStart = metadataStr.indexOf("{");
          const jsonEnd = metadataStr.lastIndexOf("}") + 1;

          if (jsonStart !== -1 && jsonEnd !== -1) {
            // if valid JSON
            const jsonStr = metadataStr.substring(jsonStart, jsonEnd);
            const metadata = JSON.parse(jsonStr); // convert into real JSON

            if (metadata.pass === true && metadata.newObjective) {
              // artifically create a 1-second delay to make sure MySQL saves ai response first
              await new Promise((resolve) => setTimeout(resolve, 1000));

              await db.insert(messages).values({
                id: `msg_${randomUUID()}`,
                workspaceId: workspaceId,
                role: "system",
                content: `🎯 Current Task: ${metadata.newObjective}`,
              });
            }
          }
        } catch (error) {
          console.error("Backend parsing failed for system message:", error);
        }
      }
    } catch (error) {
      console.error("Gemini API Error: ", error);
      await stream.write("\n\n*[Connection Terminated]*");
    }
  });
});
