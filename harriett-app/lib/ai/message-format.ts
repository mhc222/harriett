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

export function isFacebookDraftCommand(body: string): boolean {
  return /\b(?:facebook|social(?: media)?)\b/i.test(body)
    && /\b(?:create|draft|make|prepare|write|generate)\b/i.test(body)
    && /\b(?:post|caption|copy)\b/i.test(body);
}

export function isFacebookDeleteCommand(body: string, hasRecentFacebookPostContext = false): boolean {
  const normalized = body.trim().replace(/[.!]+$/, "").trim();
  const explicit = /\b(?:delete|remove)\b[\s\S]{0,40}\b(?:facebook|post)\b|\b(?:take|pull)\b[\s\S]{0,20}\b(?:facebook|post)\b[\s\S]{0,20}\bdown\b|\b(?:facebook|post)\b[\s\S]{0,40}\b(?:delete|remove)\b/i.test(normalized);
  if (explicit) return true;
  return hasRecentFacebookPostContext
    && /^(?:please\s+)?(?:delete|remove)\s+(?:it|that|this)|^(?:please\s+)?(?:take|pull)\s+(?:it|that|this)\s+down$/i.test(normalized);
}

type ProcessingCategory = "facebook_publish" | "facebook_draft" | "document_review" | "research" | "artifact";

export interface ProcessingAcknowledgementDecision {
  message: string | null;
  category: ProcessingCategory | null;
  reason: "long_task" | "recent_acknowledgement" | "quick_task";
}

const ACKNOWLEDGEMENTS: Record<ProcessingCategory, string[]> = {
  facebook_publish: [
    "I’m sending that to Facebook now. I’ll bring you the live link when Meta confirms it.",
    "I’ve got it. I’m posting the approved draft and waiting on Facebook’s confirmation.",
    "On it. I’ll send the Facebook link here as soon as the post is live.",
  ],
  facebook_draft: [
    "I’m pulling the listing details and putting that Facebook post together now.",
    "On it. I’m checking the property facts before I draft the Facebook post.",
    "Let me get that Facebook post together. I’ll bring the draft back here for your review.",
  ],
  document_review: [
    "Let me review the transaction record and documents. I’ll bring back what I find.",
    "I’m checking the documents and transaction details now. I’ll report back here.",
    "I’ve got it. Let me work through the file and verify the details.",
  ],
  research: [
    "Let me check the current sources and pull that together for you.",
    "I’m looking into that now. I’ll bring you the useful part when it’s ready.",
    "On it. Let me verify the current information before I answer.",
  ],
  artifact: [
    "I’m putting that together now. I’ll send it here when it’s ready.",
    "I’ve got it. Give me a moment to work through the details.",
    "Let me build that for you. I’ll bring the finished draft back here.",
  ],
};

function processingCategory(body: string, hasAttachments: boolean): ProcessingCategory | null {
  if (isFacebookPublishApproval(body)) return "facebook_publish";
  if (isFacebookDraftCommand(body)) return "facebook_draft";
  if (hasAttachments || (
    /\b(?:review|analy[sz]e|check|compare|summarize|read)\b/i.test(body)
    && /\b(?:document|contract|agreement|addendum|disclosure|packet|form|file|pdf)\b/i.test(body)
  )) return "document_review";
  if (/\b(?:research|search (?:the )?(?:web|internet|online)|look into|investigate|current rates?|market research)\b/i.test(body)) {
    return "research";
  }
  if (/\b(?:create|draft|prepare|build|generate|write)\b/i.test(body)
    && /\b(?:cma|seller brief|report|proposal|marketing plan|email campaign|presentation)\b/i.test(body)) {
    return "artifact";
  }
  return null;
}

function stableIndex(seed: string, length: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash * 31) + seed.charCodeAt(index)) >>> 0;
  }
  return hash % length;
}

export function processingAcknowledgement(input: {
  body: string;
  seed?: string;
  hasAttachments?: boolean;
  recentlyAcknowledged?: boolean;
  previousMessage?: string | null;
}): ProcessingAcknowledgementDecision {
  const category = processingCategory(input.body, input.hasAttachments ?? false);
  if (!category) return { message: null, category: null, reason: "quick_task" };
  if (input.recentlyAcknowledged) {
    return { message: null, category, reason: "recent_acknowledgement" };
  }
  const options = ACKNOWLEDGEMENTS[category];
  const preferredIndex = stableIndex(input.seed ?? input.body, options.length);
  const preferred = options[preferredIndex];
  const message = preferred === input.previousMessage
    ? options[(preferredIndex + 1) % options.length]
    : preferred;
  return { message, category, reason: "long_task" };
}
