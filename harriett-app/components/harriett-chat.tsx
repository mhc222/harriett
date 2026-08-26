"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, CircleStop, RotateCcw, Sparkles } from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const suggestions = [
  "What listings do I have?",
  "What needs my attention today?",
  "Draft a Facebook post for my newest listing.",
];

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<UIMessage["parts"][number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export function HarriettChat({
  agentName,
  initialMessages,
}: {
  agentName: string;
  initialMessages: UIMessage[];
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    regenerate,
    clearError,
  } = useChat({
    id: "harriett-pwa-chat",
    messages: initialMessages,
    transport,
  });
  const isWorking = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isWorking]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isWorking) return;
    clearError();
    setInput("");
    await sendMessage({ text });
  }

  async function submitSuggestion(suggestion: string) {
    if (isWorking) return;
    clearError();
    await sendMessage({ text: suggestion });
  }

  return (
    <div className="chat-workspace">
      <aside className="chat-context" aria-label="About Harriett chat">
        <div className="chat-context-identity">
          <span className="chat-context-portrait" aria-hidden="true">
            <Image src="/harriett-logo.png" alt="" width={112} height={112} priority />
          </span>
          <div>
            <p className="eyebrow">Your assistant</p>
            <h1>Ask Harriett</h1>
          </div>
        </div>
        <p>
          Ask naturally. Harriett can look through your work, prepare drafts, and carry out approved actions.
        </p>
        <div className="chat-context-status">
          <span aria-hidden="true" />
          <p><strong>Ready</strong><small>Your conversation is saved to your activity trail.</small></p>
        </div>
      </aside>

      <section className="chat-panel" aria-label="Conversation with Harriett">
        <header className="chat-panel-header">
          <div>
            <p className="eyebrow">Conversation</p>
            <h2>Hi, {agentName}.</h2>
          </div>
          <p>Private to your Harriett account</p>
        </header>

        <div className="chat-thread" aria-live="polite">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <Sparkles size={22} strokeWidth={1.6} aria-hidden="true" />
              <h3>What can I help you get done?</h3>
              <p>You do not need a special command. Start with one of these, or say it your own way.</p>
              <div className="chat-suggestions">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => submitSuggestion(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const text = messageText(message);
              if (!text) return null;
              const isAgent = message.role === "user";
              return (
                <article
                  key={message.id}
                  className={`chat-message ${isAgent ? "chat-message-agent" : "chat-message-harriett"}`}
                >
                  {!isAgent && (
                    <span className="chat-message-avatar" aria-hidden="true">
                      <Image src="/harriett-logo.png" alt="" width={48} height={48} />
                    </span>
                  )}
                  <div>
                    <p className="chat-message-label">{isAgent ? "You" : "Harriett"}</p>
                    <div className="chat-message-body">{text}</div>
                  </div>
                </article>
              );
            })
          )}

          {isWorking && (
            <div className="chat-typing-row" role="status" aria-label="Harriett is typing">
              <span className="chat-message-avatar" aria-hidden="true">
                <Image src="/harriett-logo.png" alt="" width={48} height={48} />
              </span>
              <div className="chat-typing-bubble" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <button type="button" onClick={() => stop()} aria-label="Stop Harriett">
                <CircleStop size={18} aria-hidden="true" />
              </button>
            </div>
          )}

          {error && (
            <div className="chat-error" role="alert">
              <div>
                <strong>That did not finish.</strong>
                <p>{error.message || "Harriett could not complete the request."}</p>
              </div>
              <button type="button" onClick={() => regenerate()}>
                <RotateCcw size={15} aria-hidden="true" /> Try again
              </button>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="chat-composer" onSubmit={submit}>
          <label htmlFor="harriett-message" className="sr-only">Message Harriett</label>
          <textarea
            id="harriett-message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask Harriett anything about your work"
            rows={1}
            disabled={isWorking}
          />
          <button type="submit" disabled={!input.trim() || isWorking} aria-label="Send message">
            <ArrowUp size={19} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <p>Enter to send, Shift and Enter for a new line.</p>
        </form>
      </section>
    </div>
  );
}
