import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-sonnet-4-5";

export async function callClaudeWithPdf(
  systemPrompt: string,
  pdfBase64: string,
  maxTokens = 2048
): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          } as Anthropic.DocumentBlockParam,
          {
            type: "text",
            text: "Extract the deal information from this listing agreement and return it as JSON.",
          },
        ],
      },
    ],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2048
): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  // Strip markdown code fences if present
  return block.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
}
