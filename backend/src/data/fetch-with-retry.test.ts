import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWithRetry } from "./fetch-with-retry";

describe("fetchWithRetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries transient HTTP failures and succeeds", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("x", { status: 500 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://example.com", undefined, { retries: 2, baseDelayMs: 1 });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries thrown network errors up to limit", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://example.com", undefined, { retries: 2, baseDelayMs: 1 });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("stops retrying after max retries", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("x", { status: 500 }));

    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://example.com", undefined, { retries: 2, baseDelayMs: 1 });

    expect(res.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
