export type AppConfig = {
  apiBaseUrl: string;
  useMocks: boolean;
};

function readBooleanQueryParam(name: string): boolean | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get(name);
  if (raw == null) return null;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return null;
}

export async function getConfig(): Promise<AppConfig> {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load /config.json: ${res.status}`);
  const json = (await res.json()) as {
    apiBaseUrl?: unknown;
    useMocks?: unknown;
  };
  if (!json.apiBaseUrl || typeof json.apiBaseUrl !== "string") {
    throw new Error("Invalid config.json: missing apiBaseUrl");
  }

  const useMocksOverride = readBooleanQueryParam("mocks") ?? readBooleanQueryParam("useMocks");
  return {
    apiBaseUrl: json.apiBaseUrl.replace(/\/$/, ""),
    useMocks:
      useMocksOverride ?? (typeof json.useMocks === "boolean" ? json.useMocks : false),
  };
}
