export type AppConfig = {
  apiBaseUrl: string;
  auth: {
    enabled: boolean;
    region?: string;
    userPoolId?: string;
    clientId?: string;
  };
};

export async function getConfig(): Promise<AppConfig> {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load /config.json: ${res.status}`);
  const json = (await res.json()) as {
    apiBaseUrl?: unknown;
    auth?: {
      enabled?: unknown;
      region?: unknown;
      userPoolId?: unknown;
      clientId?: unknown;
    };
  };
  if (!json.apiBaseUrl || typeof json.apiBaseUrl !== "string") {
    throw new Error("Invalid config.json: missing apiBaseUrl");
  }
  return {
    apiBaseUrl: json.apiBaseUrl.replace(/\/$/, ""),
    auth: {
      enabled: Boolean(json.auth?.enabled),
      region: typeof json.auth?.region === "string" ? json.auth.region : undefined,
      userPoolId: typeof json.auth?.userPoolId === "string" ? json.auth.userPoolId : undefined,
      clientId: typeof json.auth?.clientId === "string" ? json.auth.clientId : undefined,
    },
  };
}
