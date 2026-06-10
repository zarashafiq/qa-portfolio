/**
 * Eval runner.
 *
 * Executes every case against its scorers, prints a readable report, and sets
 * the process exit code so CI fails when a rule-based gate is breached.
 *
 * Design choice worth explaining: cases tagged as rule-based gates MUST pass
 * (they fail the build). The one case that is *expected* to fail (the chatty-
 * JSON bug) is asserted as a known-negative, so a green run means "the checks
 * are working", not "nothing was tested".
 */

import { dataset } from "./dataset.js";
import type { CaseResult } from "./types.js";

/** Cases we EXPECT to fail — they prove the scorers actually catch bugs. */
const EXPECTED_FAILURES = new Set(["action-items-json-wrapped"]);

async function run(): Promise<void> {
  const results: CaseResult[] = [];

  for (const c of dataset) {
    const scores = [];
    for (const scorer of c.scorers) {
      scores.push(await scorer({ input: c.input, output: c.output, reference: c.reference }));
    }
    results.push({
      id: c.id,
      input: c.input,
      output: c.output,
      scores,
      passed: scores.every((s) => s.passed),
    });
  }

  // ---- report ----
  console.log("\n  LLM OUTPUT EVALUATION REPORT");
  console.log("  " + "=".repeat(60));

  let unexpected = 0;

  for (const r of results) {
    const expectedToFail = EXPECTED_FAILURES.has(r.id);
    const ok = expectedToFail ? !r.passed : r.passed;
    if (!ok) unexpected++;

    const tag = expectedToFail
      ? r.passed
        ? "BROKEN (should have failed)"
        : "caught expected bug"
      : r.passed
        ? "pass"
        : "FAIL";

    console.log(`\n  [${ok ? "OK" : "XX"}] ${r.id}  — ${tag}`);
    for (const s of r.scores) {
      console.log(`         ${s.passed ? "·" : "!"} ${s.name}: ${s.detail}`);
    }
  }

  const total = results.length;
  console.log("\n  " + "=".repeat(60));
  console.log(`  ${total - unexpected}/${total} cases behaved as expected`);
  console.log("");

  // Non-zero exit fails the CI job.
  process.exit(unexpected === 0 ? 0 : 1);
}

run();
