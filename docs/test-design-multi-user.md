# Test design: isolating multi-user / per-user state

Notes on the pattern behind `tests/saucedemo/multi-user.spec.ts`, and how I
approach it on real products.

## The problem

Some bugs only appear when more than one user touches the system at once. If
user data is supposed to be **per-user** (each person has their own copy), the
dangerous failure is *state bleed*: one user's action showing up in another's
session. A single-session test can never see this — it only has one user.

## The pattern

Drive two (or more) **fully isolated browser contexts** in parallel. Each
context has its own cookies, storage, and session, so they behave like two
different people on two different machines. Then:

1. Both users reach the same starting state.
2. User A performs an action that changes *their* state.
3. Assert A's state changed **and** B's did not.

Step 3 is the whole point. The assertion that B is *unaffected* is what proves
isolation. Most test suites assert the positive ("A's cart has 1 item") and
forget the negative ("B's cart still has 0") — and the negative is where the
real bug hides.

## Why contexts, not just pages

In Playwright, two pages in the *same* context share storage — that wouldn't be
two users, it'd be one user with two tabs. Two separate **contexts** is the
correct isolation boundary. Getting this distinction right is the difference
between a test that actually checks isolation and one that looks like it does.

## How it generalizes

The same shape applies well beyond a shopping cart:

- **Collaborative docs / notes:** if notes are individual copies, editing one
  user's note must not mutate another's. Same A-acts / B-unaffected assertion.
- **Role-based views:** a host and a guest should see different things from the
  same underlying event; drive both and assert the divergence.
- **Tenancy:** data created in tenant A must never be queryable from tenant B.

The product changes; the isolation assertion doesn't.
