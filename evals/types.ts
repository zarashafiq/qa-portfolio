/**
 * Core types for the LLM evaluation suite.
 *
 * The mental model: an LLM is non-deterministic, so we never assert
 * `output === "exact string"`. Instead we assert that the output has
 * certain *properties*. Each property check is a "scorer". A test case
 * bundles an input, the output we got, and the scorers that output must pass.
 */

/** The result of running one scorer against one output. */
export interface ScoreResult {
  /** Human-readable name of what was checked, e.g. "valid-json". */
  name: string;
  /** Did the output satisfy this property? */
  passed: boolean;
  /** 0..1 numeric score. For pass/fail checks this is 1 or 0. */
  score: number;
  /** Why it passed or failed — shown in the report so failures are debuggable. */
  detail: string;
}

/**
 * A scorer is just a function: given the model output (and optionally the
 * input + a reference answer), return a ScoreResult. Keeping scorers as plain
 * functions means they compose freely and are trivial to unit test themselves.
 */
export type Scorer = (ctx: ScoreContext) => ScoreResult | Promise<ScoreResult>;

export interface ScoreContext {
  /** What we sent the model. */
  input: string;
  /** What the model returned. */
  output: string;
  /** Optional gold-standard answer for reference-based scoring. */
  reference?: string;
}

/** One row in an eval dataset. */
export interface EvalCase {
  id: string;
  input: string;
  output: string;
  reference?: string;
  /** The properties this particular output must satisfy. */
  scorers: Scorer[];
}

/** Aggregated outcome for one case across all its scorers. */
export interface CaseResult {
  id: string;
  input: string;
  output: string;
  scores: ScoreResult[];
  passed: boolean;
}
