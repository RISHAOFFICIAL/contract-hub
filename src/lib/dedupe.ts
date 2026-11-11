/**
 * Deduplicates a list of strings while preserving first-seen order.
 * Comparison ignores surrounding whitespace and letter casing, so
 * "Janitorial" and "janitorial" count as the same value; the first
 * occurrence's trimmed text is kept. Empty strings are dropped.
 */
export function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const trimmed = (v ?? "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
