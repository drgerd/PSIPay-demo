type FetchRetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  requestName?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: FetchRetryOptions
): Promise<Response> {
  const retries = Math.max(0, Math.min(2, options?.retries ?? 2));
  const baseDelayMs = Math.max(50, Math.min(2000, options?.baseDelayMs ?? 250));
  const requestName = options?.requestName || "upstream_request";

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (!shouldRetryStatus(response.status) || attempt === retries) {
        if (attempt > 0 && !shouldRetryStatus(response.status)) {
          console.info(
            JSON.stringify({
              event: "upstream_retry_recovered",
              requestName,
              attempts: attempt + 1,
              status: response.status,
            })
          );
        }
        return response;
      }
      console.warn(
        JSON.stringify({
          event: "upstream_retry",
          requestName,
          attempt: attempt + 1,
          status: response.status,
          nextDelayMs: baseDelayMs * 2 ** attempt,
        })
      );
    } catch (err) {
      lastError = err;
      if (attempt === retries) throw err;
      console.warn(
        JSON.stringify({
          event: "upstream_retry",
          requestName,
          attempt: attempt + 1,
          error: err instanceof Error ? err.message : String(err),
          nextDelayMs: baseDelayMs * 2 ** attempt,
        })
      );
    }

    const delayMs = baseDelayMs * 2 ** attempt;
    await sleep(delayMs);
  }

  if (lastError) throw lastError;
  throw new Error("fetch_retry_exhausted");
}
