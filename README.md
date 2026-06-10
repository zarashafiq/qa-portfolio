# QA Portfolio — Zara Shafiq

QA engineering work samples across three surfaces: **LLM output evaluation** (testing AI products where output isn't deterministic), **Playwright E2E** (cross-browser, multi-user, CDP), and **API contract testing** (Playwright + Postman).

Everything here runs in CI on every push. Nothing is a mockup.

- Portfolio: [zarashafiq.com](https://zarashafiq.com)

---

## 1. LLM output evaluation (`/evals`)

The hard problem now. You can't assert `output === "expected"` against a model — ask it the same thing twice and the wording changes. So instead of matching strings, this suite asserts that output has the right **properties**, using three techniques in increasing cost:

| Technique | What it checks | Example here |
|---|---|---|
| **Rule-based** | Deterministic code checks. Fast, free, every commit. | Is the action-item output valid JSON? Under length? Did it avoid leaking the system prompt? |
| **Reference-based** | Fuzzy similarity to a known-good answer — *not* exact match. | Does the summary overlap enough with the reference (Jaccard; embeddings in prod)? |
| **LLM-as-judge** | A second model grades the first against a rubric, as structured JSON. | Is the summary faithful to the transcript with no invented facts? |

Design points worth noting:

- The judge's model call is **dependency-injected**, so CI runs against a deterministic fake (no API key, no cost) while production swaps in a real Anthropic/OpenAI client — one line, scorer code unchanged. Real integration shown in `evals/model.ts`.
- The dataset includes a **deliberate known-failure** (a model wrapping JSON in chatty prose). A green run means the checks actually bite — not that nothing was tested.

```bash
npm run test:eval
```

Cases are modeled on an AI meeting-notes / transcription product: action-item extraction, faithful summarization, PII suppression, prompt-injection refusal. Approach notes in [`docs/testing-ai.md`](docs/testing-ai.md).

## 2. Playwright E2E (`/tests`)

Cross-browser (Chromium, Firefox, WebKit), Page Object pattern to keep locators out of assertions.

- **Multi-user isolation** (`tests/saucedemo/multi-user.spec.ts`): two isolated browser contexts driven in parallel to catch cross-session state bleed — the bug class single-session tests can't see. Design writeup in [`docs/test-design-multi-user.md`](docs/test-design-multi-user.md).
- **Session injection** (`tests/saucedemo/session-injection.spec.ts`): authenticate once, capture storage state, inject it into fresh contexts so tests start logged-in and stay fast.
- **Boundary values** (`tests/saucedemo/boundary-values.spec.ts`): data-driven login coverage across valid / locked-out / wrong-password / empty-field partitions.
- **Functional + edge cases** (`tests/specs/todo.spec.ts`): ordering, active counter, localStorage persistence, whitespace trimming, unicode/emoji, rapid entry.
- **Network conditions via CDP** (`tests/specs/network.spec.ts`): drives the Chrome DevTools Protocol to emulate offline and throttled-3G. CDP plumbing in `tests/helpers/cdp.ts`. Chromium-only, skipped elsewhere.

```bash
npm test          # all browsers
npm run test:ui   # interactive
```

## 3. API contracts (`/tests/specs/api.spec.ts` + `/api-tests`)

The layer below the UI, covered two ways:

- **Playwright** (`tests/specs/api.spec.ts`): status codes, response shape, a create→read round-trip with teardown, 404 handling.
- **Postman/Newman** (`api-tests/collection.json`): the same contract as a portable collection.

```bash
npm run test:api  # requires newman: npx newman run api-tests/collection.json
```

---

## Stack

TypeScript throughout · Playwright · Postman/Newman · GitHub Actions CI (evals gate the browser job) · every command above runs.

## Layout

```
evals/                LLM output evaluation suite
  types.ts              scorer/result vocabulary
  scorers.ts            rule-based · reference · llm-as-judge
  model.ts              injected fake judge (+ real Anthropic reference)
  dataset.ts            cases modeled on a meeting-notes product
  run-evals.ts          runner, report, CI exit code
tests/
  pages/                Page Objects (Saucedemo, TodoMVC)
  helpers/cdp.ts        Chrome DevTools Protocol helpers
  saucedemo/            multi-user, session injection, boundary values
  specs/                TodoMVC functional/edge, CDP network, API contract
api-tests/
  collection.json       Postman/Newman API contract collection
docs/
  testing-ai.md             how I think about testing AI output
  test-design-multi-user.md the multi-user isolation pattern
.github/workflows/      CI
```
