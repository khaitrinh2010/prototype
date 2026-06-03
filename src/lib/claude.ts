import Anthropic from "@anthropic-ai/sdk";
import { env } from "~/env";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a UI prototyping assistant. Generate a complete, self-contained HTML document with embedded CSS.

Output format — two parts in this exact order:
1. The full HTML document (starting with <!DOCTYPE html>, ending with </html>)
2. One line: ALLOY_MSG: <one friendly sentence describing what you built or changed>

Rules:
- No markdown, no code fences
- All styles in a <style> tag, no external CDN links
- Realistic placeholder content, polished modern design

When updating an existing UI:
- Preserve the ENTIRE existing HTML structure, all CSS, all content exactly as-is
- Only make the specific change requested — nothing else
- Do not reorganize, restyle, rename, or remove anything that was not explicitly asked to change`;

export async function generateUI(
  userPrompt: string,
  previousHtml?: string,
): Promise<{ html: string; message: string }> {
  const userMessage = previousHtml
    ? `Here is the current UI. You must preserve its exact HTML structure and CSS.\n\nOnly apply this specific change: ${userPrompt}\n\nCurrent HTML:\n${previousHtml}`
    : `Create a UI for: ${userPrompt}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content[0];
  if (!content || content.type !== "text") {
    throw new Error("Unexpected response from Claude");
  }

  const raw = content.text.trim();

  const msgMatch = raw.match(/ALLOY_MSG:\s*(.+)/);
  const message = msgMatch?.[1]?.trim() ?? "Done! Your UI is ready.";

  const htmlEnd = raw.lastIndexOf("</html>");
  let html = htmlEnd !== -1 ? raw.slice(0, htmlEnd + 7).trim() : raw;

  if (html.startsWith("```")) {
    html = html.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  }

  return { html, message };
}
