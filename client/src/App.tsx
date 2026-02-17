import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { AppConfig } from "./api/config";
import { Dashboard } from "./pages/Dashboard";

type AppProps = {
  config: AppConfig;
};

const AUTH_TOKEN_STORAGE_KEY = "psipay_id_token";

async function signInWithCognito(config: AppConfig, username: string, password: string): Promise<string> {
  if (!config.auth.region || !config.auth.clientId) {
    throw new Error("Auth is enabled but Cognito config is missing.");
  }

  const endpoint = `https://cognito-idp.${config.auth.region}.amazonaws.com/`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amz-target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: config.auth.clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    }),
  });

  const payload = (await response.json()) as {
    AuthenticationResult?: { IdToken?: string };
    message?: string;
    __type?: string;
  };

  if (!response.ok) {
    const reason = payload.message || payload.__type || `HTTP ${response.status}`;
    throw new Error(`Login failed: ${reason}`);
  }

  const token = payload.AuthenticationResult?.IdToken;
  if (!token) throw new Error("Login failed: missing ID token.");
  return token;
}

function LoginForm({
  config,
  onSignedIn,
  message,
}: {
  config: AppConfig;
  onSignedIn: (token: string) => void;
  message?: string;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await signInWithCognito(config, username, password);
      sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      onSignedIn(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 20, border: "1px solid #d6dbe5", borderRadius: 10 }}>
      <h1 style={{ marginTop: 0 }}>Psipay Login</h1>
      <p style={{ color: "#555" }}>Sign in to access protected comparison APIs.</p>
      {message && <p style={{ color: "#6a4f00", background: "#fff9e6", padding: 8, borderRadius: 8 }}>{message}</p>}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <button type="submit" disabled={loading} style={{ padding: "10px 14px", cursor: "pointer" }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
    </div>
  );
}

export default function App({ config }: AppProps) {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginMessage, setLoginMessage] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) setAuthToken(token);
  }, []);

  function onLogout() {
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setAuthToken(null);
  }

  function onUnauthorized() {
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setLoginMessage("Your session expired. Please sign in again.");
  }

  if (config.auth.enabled && !authToken) {
    return (
      <LoginForm
        config={config}
        onSignedIn={(token) => {
          setLoginMessage("");
          setAuthToken(token);
        }}
        message={loginMessage}
      />
    );
  }

  return (
    <Dashboard
      config={config}
      authToken={authToken || undefined}
      onLogout={config.auth.enabled ? onLogout : undefined}
      onUnauthorized={config.auth.enabled ? onUnauthorized : undefined}
    />
  );
}
