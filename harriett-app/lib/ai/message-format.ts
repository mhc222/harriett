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
    && /\b(?:post|caption|copy|listing)\b/i.test(body);
}

export function isFacebookDeleteCommand(body: string, hasRecentFacebookPostContext = false): boolean {
  const normalized = body.trim().replace(/[.!]+$/, "").trim();
  const explicit = /\b(?:delete|remove)\b[\s\S]{0,40}\b(?:facebook|post)\b|\b(?:take|pull)\b[\s\S]{0,20}\b(?:facebook|post)\b[\s\S]{0,20}\bdown\b|\b(?:facebook|post)\b[\s\S]{0,40}\b(?:delete|remove)\b/i.test(normalized);
  if (explicit) return true;
  return hasRecentFacebookPostContext
    && /^(?:please\s+)?(?:delete|remove)\s+(?:it|that|this)|^(?:please\s+)?(?:take|pull)\s+(?:it|that|this)\s+down$/i.test(normalized);
}

export function isContactCardCommand(body: string): boolean {
  const normalized = body.trim().replace(/[.!?]+$/, "").trim();
  return /^(?:(?:please|can you|would you|will you)\s+)?(?:send|text|share|give)\s+(?:me\s+)?(?:your|harriett(?:'s)?)\s+(?:contact\s+)?card$/i.test(normalized)
    || /^(?:how do i|let me)\s+(?:save|add)\s+(?:you|harriett)(?:\s+(?:as a contact|to my contacts))?$/i.test(normalized);
}

type ProcessingCategory = "facebook_publish" | "facebook_draft" | "document_review" | "research" | "artifact";

export interface ProcessingAcknowledgementDecision {
  message: string | null;
  category: ProcessingCategory | null;
  reason: "long_task" | "deadline_fallback" | "deadline_not_reached" | "quick_task";
}

const GENERIC_DEADLINE_ACKNOWLEDGEMENTS = [
  "One sec, I’m checking that now.",
  "I’m on it. I’ll bring the answer back here.",
  "Give me a moment to work through that. I’ll reply here when it’s ready.",
];

const ACKNOWLEDGEMENTS: Record<ProcessingCategory, string[]> = {
  facebook_publish: [
    "Yep, I’m posting it now. I’ll send you the Facebook link as soon as it’s live.",
    "I’ve got it. Give me a minute to post it, and I’ll bring the live link back here.",
    "On it. I’ll send you the Facebook link once the post is live.",
  ],
  facebook_draft: [
    "Yep, give me a minute. I’ll check the listing and get that Facebook post over to you.",
    "Sure, let me pull the listing details. I’ll send the Facebook draft back here in a minute.",
    "I’ve got it. Give me a minute to check the property and put the post together.",
  ],
  document_review: [
    "Sure, give me a minute to check the file. I’ll send you what I find.",
    "Let me look through the documents and transaction details. I’ll get back to you here.",
    "I’ve got it. Give me a minute to work through the file and check the details.",
  ],
  research: [
    "Sure, give me a minute to look into that. I’ll send you what I find.",
    "Let me check that for you. I’ll get back to you here in a minute.",
    "On it. I’m checking the current information before I answer.",
  ],
  artifact: [
    "Sure, give me a minute to put that together. I’ll send it back here.",
    "I’ve got it. Let me work through the details, and I’ll get it over to you.",
    "Let me put that together for you. I’ll send the finished draft back here.",
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
  deadlineExpired?: boolean;
  previousMessage?: string | null;
}): ProcessingAcknowledgementDecision {
  const category = processingCategory(input.body, input.hasAttachments ?? false);
  if (!input.deadlineExpired) {
    return {
      message: null,
      category,
      reason: category ? "deadline_not_reached" : "quick_task",
    };
  }
  const options = category
    ? ACKNOWLEDGEMENTS[category]
    : GENERIC_DEADLINE_ACKNOWLEDGEMENTS;
  const preferredIndex = stableIndex(input.seed ?? input.body, options.length);
  const preferred = options[preferredIndex];
  const message = preferred === input.previousMessage
    ? options[(preferredIndex + 1) % options.length]
    : preferred;
  return {
    message,
    category,
    reason: category ? "long_task" : "deadline_fallback",
  };
}
