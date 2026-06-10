/**
 * The scorer library. Three families, cheapest first:
 *
 *   1. Rule-based   — deterministic code checks. Fast, free, run every commit.
 *   2. Reference    — fuzzy comparison to a known-good answer.
 *   3. LLM-as-judge — a second model grades the first against a rubric.
 *
 * In a real pipeline you run (1) on every push as a gate, and (2)/(3) on a
 * schedule or pre-release because they're slower and (3) costs money.
 */

import type { Scorer } from "./types.js";

/* ------------------------------------------------------------------ *
 * 1. RULE-BASED SCORERS
 * ------------------------------------------------------------------ */

/** Output must parse as JSON. The single most common contract for an LLM
 *  feature that feeds downstream code. A model that returns prose around
 *  its JSON ("Sure! Here's the JSON: {...}") breaks the consumer silently. */
export const isValidJson: Scorer = ({ output }) => {
  try {
    JSON.parse(output);
    return { name: "valid-json", passed: true, score: 1, detail: "parsed cleanly" };
  } catch (e) {
    return {
      name: "valid-json",
      passed: false,
      score: 0,
      detail: `JSON.parse failed: ${(e as Error).message}`,
    };
  }
};

/** Output must stay within a length budget. Models drift long; long output
 *  costs tokens and often means the model ignored a formatting instruction. */
export const maxLength = (limit: number): Scorer => ({ output }) => {
  const len = output.length;
  return {
    name: `max-length-${limit}`,
    passed: len <= limit,
    score: len <= limit ? 1 : 0,
    detail: `${len} chars (limit ${limit})`,
  };
};

/** Output must NOT contain any forbidden substrings. Use for: refusing to
 *  leak a system prompt, never emitting a banned phrase, not echoing PII. */
export const mustNotContain = (banned: string[]): Scorer => ({ output }) => {
  const hit = banned.find((b) => output.toLowerCase().includes(b.toLowerCase()));
  return {
    name: "must-not-contain",
    passed: !hit,
    score: hit ? 0 : 1,
    detail: hit ? `found banned term: "${hit}"` : "no banned terms",
  };
};

/** Output must contain ALL required substrings. Use for: did the summary keep
 *  the key entities, did the refusal include a safe-completion pointer, etc. */
export const mustContainAll = (required: string[]): Scorer => ({ output }) => {
  const missing = required.filter((r) => !output.toLowerCase().includes(r.toLowerCase()));
  return {
    name: "must-contain-all",
    passed: missing.length === 0,
    score: (required.length - missing.length) / required.length,
    detail: missing.length ? `missing: ${missing.join(", ")}` : "all present",
  };
};

/* ------------------------------------------------------------------ *
 * 2. REFERENCE-BASED SCORER
 * ------------------------------------------------------------------ */

/**
 * Token-overlap (Jaccard) similarity against a reference answer.
 *
 * This is a deliberately simple stand-in for what a production system might
 * do with embeddings/cosine similarity. The POINT, and the thing to say on a
 * call, is: we do NOT string-match LLM output, because wording varies. We
 * measure semantic overlap and assert it clears a threshold. Jaccard is the
 * honest, dependency-free version of that idea; embeddings are the upgrade.
 */
export const referenceOverlap = (threshold: number): Scorer => ({ output, reference }) => {
  if (!reference) {
    return { name: "reference-overlap", passed: false, score: 0, detail: "no reference provided" };
  }
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean));
  const a = tokenize(output);
  const b = tokenize(reference);
  const intersection = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  const score = union === 0 ? 0 : intersection / union;
  return {
    name: "reference-overlap",
    passed: score >= threshold,
    score,
    detail: `Jaccard ${score.toFixed(2)} (threshold ${threshold})`,
  };
};

/* ------------------------------------------------------------------ *
 * 3. LLM-AS-JUDGE SCORER
 * ------------------------------------------------------------------ */

/**
 * Grade the output with a second LLM call against a rubric.
 *
 * This is the current state-of-the-art for evaluating open-ended generation
 * (summaries, answers, tone) where no rule or reference fully captures
 * "is this good?". Key design points an interviewer will probe:
 *
 *   - We ask the judge for STRUCTURED output (JSON: score + reason), not prose,
 *     so we can parse and threshold it.
 *   - We pin a low temperature on the judge for consistency.
 *   - We log the judge's reason, so a human can audit disagreements.
 *
 * The actual network call is injected (`callModel`) so this scorer is testable
 * offline with a fake judge — which is exactly how the suite runs in CI without
 * burning API credits. Swap in a real Anthropic/OpenAI client in production.
 */
export type ModelFn = (prompt: string) => Promise<string>;

export const llmJudge = (
  rubric: string,
  threshold: number,
  callModel: ModelFn,
): Scorer => async ({ input, output }) => {
  const judgePrompt = [
    "You are a strict evaluator. Grade the RESPONSE against the RUBRIC.",
    "Reply with ONLY JSON: {\"score\": <1-5>, \"reason\": \"<short>\"}.",
    `RUBRIC: ${rubric}`,
    `ORIGINAL REQUEST: ${input}`,
    `RESPONSE: ${output}`,
  ].join("\n");

  const raw = await callModel(judgePrompt);
  try {
    const parsed = JSON.parse(raw) as { score: number; reason: string };
    const normalized = parsed.score / 5; // map 1..5 to 0..1
    return {
      name: "llm-judge",
      passed: parsed.score >= threshold,
      score: normalized,
      detail: `judge ${parsed.score}/5 — ${parsed.reason}`,
    };
  } catch {
    return { name: "llm-judge", passed: false, score: 0, detail: `unparseable judge reply: ${raw}` };
  }
};
