/**
 * Solicitation analyzer.
 *
 * Pure function (no I/O): takes pasted solicitation text and extracts
 * proposal-relevant fields with regex heuristics. Every extracted value is
 * a DRAFT suggestion. The UI must always label these as drafts and tell the
 * user to verify against the official solicitation. Never treat output as
 * authoritative.
 */

export type DraftField = {
  value: string | null;
  /** Short snippet of the source text the value came from, for verification. */
  context: string | null;
};

export type AnalysisResult = {
  responseDeadline: DraftField;
  questionsDeadline: DraftField;
  preBidDate: DraftField;
  naics: DraftField;
  setAside: DraftField;
  evaluationFactors: DraftField;
  periodOfPerformance: DraftField;
  requiredForms: { form: string; context: string | null }[];
};

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December";

const DATE_RE = new RegExp(
  `\\b(?:(?:${MONTHS})\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})\\s*,?\\s*\\d{4}|\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})(?:\\s+(?:at\\s+)?\\d{1,2}:\\d{2}\\s*(?:[AP]M)?(?:\\s+(?:EST|EDT|CST|CDT|MST|MDT|PST|PDT|UTC|GMT))?)?\\b`,
  "i"
);

/** Returns a short readable snippet around a match index. */
function snippet(text: string, index: number, radius = 140): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  const s = text.slice(start, end).replace(/\s+/g, " ").trim();
  return (start > 0 ? "..." : "") + s + (end < text.length ? "..." : "");
}

/**
 * Finds the first date appearing at or shortly after the first keyword
 * match. Returns the date text plus the snippet it came from.
 */
function findDateAfter(
  text: string,
  keyword: RegExp,
  windowSize = 600
): DraftField {
  const re = new RegExp(keyword.source, keyword.flags.includes("i") ? "gi" : "g");
  const m = re.exec(text);
  if (!m) return { value: null, context: null };
  const slice = text.slice(m.index, m.index + windowSize);
  const d = slice.match(DATE_RE);
  if (!d || d.index === undefined)
    return { value: null, context: snippet(text, m.index) };
  return {
    value: d[0],
    context: snippet(text, m.index + d.index),
  };
}

/**
 * Captures free text right after a keyword phrase (up to a newline or a
 * max length), for fields like evaluation factors or period of performance.
 */
function captureAfter(
  text: string,
  keyword: RegExp,
  maxLen = 320
): DraftField {
  const re = new RegExp(
    `${keyword.source}[:\\s.\\-]*([^\\n]{1,${maxLen}})`,
    "i"
  );
  const m = re.exec(text);
  if (!m) return { value: null, context: null };
  const value = m[1].replace(/\s+/g, " ").trim() || null;
  return { value, context: value ? snippet(text, m.index) : null };
}

const KNOWN_FORMS: { label: string; pattern: RegExp }[] = [
  { label: "SF-1449", pattern: /\bSF[\s-]?1449\b/i },
  { label: "SF-1442", pattern: /\bSF[\s-]?1442\b/i },
  { label: "W-9", pattern: /\bW[\s-]?9\b/i },
  {
    label: "Certificate of Insurance",
    pattern: /certificate of insurance/i,
  },
  { label: "Bid Bond", pattern: /bid bond/i },
  {
    label: "Representations and Certifications",
    pattern: /representations and certifications|reps and certs/i,
  },
  {
    label: "Past Performance Questionnaire",
    pattern: /past performance (questionnaire|references?|information|narrative)/i,
  },
];

function findForms(text: string): AnalysisResult["requiredForms"] {
  const found: { form: string; context: string | null }[] = [];
  for (const f of KNOWN_FORMS) {
    const m = f.pattern.exec(text);
    if (m) found.push({ form: f.label, context: snippet(text, m.index) });
  }
  return found;
}

function findNaics(text: string): DraftField {
  const m = /NAICS[^\d]{0,30}(\d{6})/i.exec(text);
  if (!m) return { value: null, context: null };
  return { value: m[1], context: snippet(text, m.index) };
}

function findSetAside(text: string): DraftField {
  const specific = /set[-\s]?aside for ([^\n.]{1,120})/i.exec(text);
  if (specific) {
    const value = `Set aside for ${specific[1].replace(/\s+/g, " ").trim()}`;
    return { value, context: snippet(text, specific.index) };
  }
  const line = /[^\n]*set[-\s]?aside[^\n]*/i.exec(text);
  if (line) {
    const value = line[0].replace(/\s+/g, " ").trim();
    return { value: value || null, context: snippet(text, line.index) };
  }
  const smallBiz = /100%\s*small business[^\n]*/i.exec(text);
  if (smallBiz) {
    return {
      value: smallBiz[0].replace(/\s+/g, " ").trim(),
      context: snippet(text, smallBiz.index),
    };
  }
  return { value: null, context: null };
}

export function analyzeSolicitation(text: string): AnalysisResult {
  const t = (text ?? "").toString();
  if (t.trim() === "") {
    return {
      responseDeadline: { value: null, context: null },
      questionsDeadline: { value: null, context: null },
      preBidDate: { value: null, context: null },
      naics: { value: null, context: null },
      setAside: { value: null, context: null },
      evaluationFactors: { value: null, context: null },
      periodOfPerformance: { value: null, context: null },
      requiredForms: [],
    };
  }

  return {
    responseDeadline: findDateAfter(
      t,
      /(?:responses?|proposals?|bids?|offers?)(?:\s+are)?\s+due|closing\s+date|submission\s+deadline|response\s+deadline|due\s+date/i
    ),
    questionsDeadline: findDateAfter(
      t,
      /questions\s+(?:are\s+)?due|deadline\s+for\s+questions|questions\s+deadline/i
    ),
    preBidDate: findDateAfter(
      t,
      /pre[-\s]?(?:bid|proposal)(?:\s+conference)?|site\s+visit|industry\s+day/i
    ),
    naics: findNaics(t),
    setAside: findSetAside(t),
    evaluationFactors: captureAfter(t, /evaluation factors|award will be based on|basis of award/i),
    periodOfPerformance: captureAfter(
      t,
      /period of performance|base year/i
    ),
    requiredForms: findForms(t),
  };
}

/** Labels shown next to every extracted value in the UI. */
export const DRAFT_LABEL = "Draft suggestion, verify against the official solicitation";
