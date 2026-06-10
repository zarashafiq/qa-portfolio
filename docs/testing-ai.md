# Testing AI products — how I think about it

Short notes on the approach behind `/evals`. Written plainly because the ideas matter more than jargon.

## The core problem

Traditional QA is deterministic: same input, same output, assert equality. LLM output is non-deterministic — same prompt, different wording each time. So `expect(output).toBe("...")` is useless. You assert on **properties that must hold regardless of phrasing**.

## Three techniques, cheapest first

**1. Rule-based checks.** Pure code, no model. Is it valid JSON? Within length? Does it avoid banned content (leaked prompt, PII)? Does it contain required entities? Fast and free — run on every commit as a gate.

**2. Reference-based scoring.** Compare to a known-good answer by *similarity*, not equality, because wording varies. Toy version: token overlap (Jaccard). Production version: embed both texts and take cosine similarity. Same idea — measure semantic closeness, threshold it.

**3. LLM-as-judge.** For open-ended output (summaries, tone, helpfulness) where no rule captures "is this good", use a second model to grade the first against a rubric. Make it return structured JSON (score + reason) so you can parse and threshold; pin temperature low for consistency; log the reason so humans can audit. State of the art for open-ended eval, with the known caveat that judges have biases (length, position) and need spot-checking against human labels.

## What makes an eval suite trustworthy

- **A known-failure case.** If every case is green, you've proven nothing. Include one output that *should* fail, and assert that it does.
- **Separate evals from unit tests in CI.** Evals can be flaky and can cost money; don't let them block every push the same way.
- **Inject the model call.** Run CI against a deterministic fake; swap the real client in for scheduled/pre-release runs. Keeps CI free and fast.

## How I'd extend this for a specific product

- **Voice agent (e.g. a call platform):** add cases for interruption handling, accent robustness, number read-back accuracy, and silence misclassification. Score transcription against reference with WER, and judge conversational appropriateness.
- **Document extraction:** golden-set of documents with known field values; assert exact match on extracted fields, flag any silent drop or type drift; separate clean vs scanned/noisy inputs.
- **Billing / structured output:** every output is JSON-schema validated, amounts checked against expected ranges, and a known-bad input asserted to be rejected.

The framework doesn't change per product — the dataset and scorers do.
