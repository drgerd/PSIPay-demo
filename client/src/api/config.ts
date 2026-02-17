export type AppConfig = {
  apiBaseUrl: string;
};

export async function getConfig(): Promise<AppConfig> {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load /config.json: ${res.status}`);
  const json = (await res.json()) as {
    apiBaseUrl?: unknown;
  };
  if (!json.apiBaseUrl || typeof json.apiBaseUrl !== "string") {
    throw new Error("Invalid config.json: missing apiBaseUrl");
  }
  return {
    apiBaseUrl: json.apiBaseUrl.replace(/\/$/, ""),
  };
}
