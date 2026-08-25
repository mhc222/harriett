import type { AgentMessagingChannel } from "@/lib/sms";

const WHATSAPP_MAX_CHARS = 1200;

function stripMarkdownChrome(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncateAtSentence(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const clipped = text.slice(0, maxChars - 1);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf(". "),
    clipped.lastIndexOf("? "),
    clipped.lastIndexOf("! "),
    clipped.lastIndexOf("\n\n")
  );
  const end = sentenceEnd > 600 ? sentenceEnd + 1 : clipped.length;
  return `${clipped.slice(0, end).trim()}\n\nI can tighten this into a CMA-style note next.`;
}

export function formatAgentMessageForChannel(
  body: string,
  channel: AgentMessagingChannel
): string {
  const plain = stripMarkdownChrome(body);
  if (channel !== "whatsapp") return plain;
  return truncateAtSentence(plain, WHATSAPP_MAX_CHARS);
}
