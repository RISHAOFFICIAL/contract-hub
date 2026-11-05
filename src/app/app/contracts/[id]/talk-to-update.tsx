"use client";

import { useRef, useState } from "react";
import { TextInput } from "@/components/ui";
import {
  parseUpdate,
  applyUpdate,
  type ParseResult,
} from "./talk-actions";

type Phase = "idle" | "parsing" | "confirm" | "applying" | "done";

function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return "SpeechRecognition" in w || "webkitSpeechRecognition" in w;
}

export default function TalkToUpdate({ contractId }: { contractId: string }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [applied, setApplied] = useState<string[]>([]);
  const recognitionRef = useRef<unknown>(null);

  const canListen = speechSupported();

  function toggleListening() {
    if (!canListen) return;
    if (listening) {
      (recognitionRef.current as { stop: () => void } | null)?.stop();
      setListening(false);
      return;
    }
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w.SpeechRecognition ??
      w.webkitSpeechRecognition) as new () => {
      lang: string;
      interimResults: boolean;
      onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setPhase("parsing");
    const res = await parseUpdate(contractId, text);
    setResult(res);
    setPhase("confirm");
  }

  async function handleConfirm() {
    if (!result || result.planned.length === 0) return;
    setPhase("applying");
    const res = await applyUpdate(contractId, result.planned);
    setApplied(res.applied);
    setPhase("done");
  }

  function reset() {
    setText("");
    setResult(null);
    setApplied([]);
    setPhase("idle");
  }

  return (
    <div className="space-y-4">
      {(phase === "idle" || phase === "parsing") && (
        <form onSubmit={handleParse} className="space-y-3">
          <div className="flex gap-2">
            <TextInput
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Say what changed, for example: move to submitted and add note pricing confirmed"
              aria-label="Update text"
              className="flex-1"
            />
            {canListen && (
              <button
                type="button"
                onClick={toggleListening}
                aria-label={listening ? "Stop listening" : "Speak update"}
                className={`btn-glass shrink-0 px-4 py-2.5 text-sm font-semibold ${
                  listening ? "btn-primary-glass" : "glass text-forest"
                }`}
              >
                {listening ? "Listening..." : "Speak"}
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={phase === "parsing" || !text.trim()}
            className="btn-glass btn-primary-glass px-6 py-2.5 text-sm disabled:opacity-60"
          >
            {phase === "parsing" ? "Understanding..." : "Review update"}
          </button>
          <p className="text-xs text-ink-faint">
            I can move stages, set deadlines, add or complete milestones, draft
            invoices, add notes, and record supplier quotes. Nothing changes
            until you confirm.
          </p>
        </form>
      )}

      {phase === "confirm" && result && (
        <div className="rounded-2xl border border-brass/40 bg-ivory p-5">
          <h3 className="font-display text-base font-semibold text-forest">
            I will:
          </h3>
          {result.planned.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
              {result.planned.map((item, i) => (
                <li key={i}>{item.summary}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">
              Nothing I could confidently plan.
            </p>
          )}
          {result.unparsed.length > 0 && (
            <p className="mt-2 text-sm text-ink-soft">
              I did not understand: {result.unparsed.join("; ")}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={result.planned.length === 0}
              className="btn-glass btn-primary-glass px-6 py-2.5 text-sm disabled:opacity-60"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={reset}
              className="btn-glass glass px-6 py-2.5 text-sm font-semibold text-forest"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === "applying" && (
        <p className="text-sm text-ink-soft">Applying your updates...</p>
      )}

      {phase === "done" && (
        <div className="rounded-2xl border border-forest/30 bg-ivory p-5">
          <h3 className="font-display text-base font-semibold text-forest">
            Done
          </h3>
          {applied.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
              {applied.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">
              Nothing was changed.
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="btn-glass glass mt-4 px-6 py-2.5 text-sm font-semibold text-forest"
          >
            Make another update
          </button>
        </div>
      )}
    </div>
  );
}
