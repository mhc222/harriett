import type { AgentMessagingChannel } from "@/lib/sms";

const WHATSAPP_MAX_CHARS = 1200;

interface FacebookDraftWhatsAppInput {
  title: string;
  message: string;
  reviewUrl: string;
}

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

export function formatFacebookDraftForWhatsApp(input: FacebookDraftWhatsAppInput): string {
  const intro = `I created a Facebook draft for ${input.title}. Nothing has been posted yet.\n\nDraft preview:\n`;
  const ending = `\n\nReply POST IT to publish this exact draft, or review and edit it here:\n${input.reviewUrl}`;
  const available = WHATSAPP_MAX_CHARS - intro.length - ending.length;
  const cleanMessage = stripMarkdownChrome(input.message);
  if (cleanMessage.length <= available) return `${intro}${cleanMessage}${ending}`;
  const clipped = cleanMessage.slice(0, Math.max(0, available - 32));
  const paragraphEnd = clipped.lastIndexOf("\n\n");
  const preview = clipped.slice(0, paragraphEnd > 200 ? paragraphEnd : clipped.length).trim();
  return `${intro}${preview}\n\nOpen the full draft in Harriett.${ending}`;
}

export function isFacebookPublishApproval(body: string): boolean {
  const normalized = body.trim().replace(/[.!]+$/, "").trim();
  return /^(?:(?:yes|looks good|that looks good)[,\s]+)?(?:(?:go ahead)(?: and)?\s+)?(?:please\s+)?(?:post|publish|share)(?:\s+(?:it|that|this|the (?:facebook )?(?:post|draft)))?(?:\s+(?:to|on)\s+facebook)?$/i.test(normalized);
}

export function processingAcknowledgement(body: string): string {
  return isFacebookPublishApproval(body)
    ? "I’m checking that draft now. I’ll send the live Facebook link when Meta confirms it."
    : "I’m working on that now. I’ll send the result here when it’s ready.";
}
