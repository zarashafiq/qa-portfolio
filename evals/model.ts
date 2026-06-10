/**
 * A deterministic fake "model" so the eval suite runs in CI with no API key
 * and no cost, while still exercising the full llm-judge code path.
 *
 * This is NOT pretending to be a real LLM. It's a test double — the same way
 * you'd mock a payment gateway in checkout tests rather than charging a real
 * card on every CI run. In production you replace `fakeJudge` with a thin
 * wrapper around the Anthropic or OpenAI SDK; the scorer code doesn't change,
 * because the model call is injected (see scorers.ts -> llmJudge).
 *
 * To run against a real judge locally:
 *   set ANTHROPIC_API_KEY and swap `fakeJudge` for `anthropicJudge` in the
 *   dataset. The wiring is intentionally one line.
 */

import type { ModelFn } from "./scorers.js";

/**
 * Returns a JSON grade. It gives a high score unless the response is empty or
 * suspiciously short, which is enough to demonstrate pass AND fail paths in CI.
 */
export const fakeJudge: ModelFn = async (prompt: string) => {
  const responseMatch = prompt.match(/RESPONSE: ([\s\S]*)$/);
  const response = responseMatch ? responseMatch[1].trim() : "";
  const score = response.length < 15 ? 2 : 5;
  const reason = score >= 5 ? "complete and on-topic" : "too short or empty";
  return JSON.stringify({ score, reason });
};

/**
 * Real Anthropic judge — included as a reference implementation so the repo
 * shows you know the actual integration, even though CI uses the fake.
 * Uncomment and `npm i @anthropic-ai/sdk` to use locally.
 */
// import Anthropic from "@anthropic-ai/sdk";
// export const anthropicJudge: ModelFn = async (prompt) => {
//   const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
//   const msg = await client.messages.create({
//     model: "claude-sonnet-4-20250514",
//     max_tokens: 200,
//     temperature: 0, // pin low for grader consistency
//     messages: [{ role: "user", content: prompt }],
//   });
//   const block = msg.content[0];
//   return block.type === "text" ? block.text : "";
// };
