type FetchRetryOptions = {
  retries?: number;
  baseDelayMs?: number;
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

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (!shouldRetryStatus(response.status) || attempt === retries) {
        return response;
      }
    } catch (err) {
      lastError = err;
      if (attempt === retries) throw err;
    }

    const delayMs = baseDelayMs * 2 ** attempt;
    await sleep(delayMs);
  }

  if (lastError) throw lastError;
  throw new Error("fetch_retry_exhausted");
}
