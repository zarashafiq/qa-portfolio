import { type Page, type CDPSession } from "@playwright/test";

/**
 * Helpers for attaching to the Chrome DevTools Protocol (CDP).
 *
 * CDP is the low-level protocol Chromium speaks. Playwright's high-level API
 * covers most needs, but CDP lets you reach browser internals it doesn't wrap:
 * network emulation, performance metrics, forced device conditions. These
 * helpers centralize that so specs stay readable.
 *
 * Chromium-only — CDP is a Chrome protocol. Callers should guard on browser.
 */

/** Open a raw CDP session against the current page. */
export async function attachCDP(page: Page): Promise<CDPSession> {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  return client;
}

/** Emulate a fully offline network. */
export async function goOffline(client: CDPSession): Promise<void> {
  await client.send("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
}

/** Restore an unthrottled connection. */
export async function goOnline(client: CDPSession): Promise<void> {
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
}

/** Throttle to an approximate profile (latency in ms, throughput in kbps). */
export async function throttle(
  client: CDPSession,
  latencyMs: number,
  kbps: number,
): Promise<void> {
  const bytesPerSec = (kbps * 1024) / 8;
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: latencyMs,
    downloadThroughput: bytesPerSec,
    uploadThroughput: bytesPerSec,
  });
}

/** Collect basic performance metrics for the current page. */
export async function getMetrics(client: CDPSession): Promise<Record<string, number>> {
  await client.send("Performance.enable");
  const { metrics } = await client.send("Performance.getMetrics");
  return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
}
