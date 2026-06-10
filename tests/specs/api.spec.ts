import { test, expect, request } from "@playwright/test";

/**
 * API contract tests against the public restful-api.dev sandbox.
 *
 * These run independently of the browser — Playwright's request fixture is a
 * full HTTP client. The focus is contract testing: status codes, response
 * shape, round-tripping a created resource, and clean teardown. This is the
 * "test the layer below the UI" half of QA that pure click-testers skip.
 */
test.describe("REST API contract", () => {
  const BASE = "https://api.restful-api.dev";

  test("GET /objects returns a non-empty list with the expected shape", async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${BASE}/objects`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    // Contract: each object has at least id and name.
    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("name");
    await ctx.dispose();
  });

  test("POST then GET round-trips a created object", async () => {
    const ctx = await request.newContext();
    const payload = { name: "qa-portfolio probe", data: { run: Date.now() } };

    const created = await ctx.post(`${BASE}/objects`, { data: payload });
    expect(created.status()).toBe(200);
    const createdBody = await created.json();
    expect(createdBody).toHaveProperty("id");
    expect(createdBody.name).toBe(payload.name);

    const fetched = await ctx.get(`${BASE}/objects/${createdBody.id}`);
    expect(fetched.status()).toBe(200);
    const fetchedBody = await fetched.json();
    expect(fetchedBody.name).toBe(payload.name);

    // Teardown — leave the sandbox as we found it.
    const deleted = await ctx.delete(`${BASE}/objects/${createdBody.id}`);
    expect(deleted.status()).toBe(200);
    await ctx.dispose();
  });

  test("GET on a missing id returns 404", async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${BASE}/objects/this-id-does-not-exist-999999`);
    expect(res.status()).toBe(404);
    await ctx.dispose();
  });
});
