"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { askGuide, type ChatMessage, type ChatState } from "./actions";
import type { GuideAnswer } from "@/lib/guide";

const SUGGESTED = [
  "What should I do this week?",
  "How do I renew SAM?",
  "Which certifications fit my business?",
  "How do I get an EIN?",
  "How do I build business credit?",
  "What is a net 30 account?",
  "What bank should I use for my business?",
  "How do I advertise my business?",
  "What are the contract basics?",
  "How do I sign in?",
];

function AnswerCard({ answer }: { answer: GuideAnswer }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-display text-lg font-semibold text-forest">
        {answer.title}
      </h3>
      <div className="mt-2 space-y-2">
        {answer.body.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-ink">
            {p}
          </p>
        ))}
      </div>
      {answer.links && answer.links.length > 0 && (
        <ul className="mt-3 space-y-1">
          {answer.links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-brass-dark underline underline-offset-2"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      {answer.action && (
        <a
          href={answer.action.href}
          className="btn-glass btn-primary-glass mt-4 inline-block px-5 py-2 text-sm"
        >
          {answer.action.label}
        </a>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-forest px-4 py-2.5 text-sm font-medium text-ivory">
          {message.question}
        </p>
      </div>
      <AnswerCard answer={message.answer} />
    </div>
  );
}

export function ChatPanel() {
  const initialState: ChatState = { messages: [] };
  const [state, formAction] = useFormState(askGuide, initialState);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state.messages.length]);

  return (
    <section aria-label="Ask the Guide" className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SUGGESTED.map((q) => (
          <form key={q} action={formAction}>
            <input type="hidden" name="question" value={q} />
            <button
              type="submit"
              className="glass rounded-full px-4 py-2 text-xs font-semibold text-forest transition hover:brightness-95"
            >
              {q}
            </button>
          </form>
        ))}
      </div>

      {state.messages.length > 0 && (
        <div className="space-y-4">
          {state.messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <form action={formAction} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            name="question"
            required
            maxLength={500}
            placeholder="Ask the Guide anything..."
            autoComplete="off"
            className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none"
          />
          <button
            type="submit"
            className="btn-glass btn-primary-glass shrink-0 px-5 py-2.5 text-sm"
          >
            Ask
          </button>
        </div>
        <p className="text-xs text-ink-faint">
          Never type passwords here. Contract Hub will never ask for one.
        </p>
      </form>
    </section>
  );
}
