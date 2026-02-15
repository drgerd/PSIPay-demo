import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { getConfig } from "./api/config";

async function bootstrap() {
  const config = await getConfig();
  if (config.useMocks) {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass" });
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App config={config} />
    </React.StrictMode>
  );
}

bootstrap().catch((err) => {
  const root = document.getElementById("root");
  if (root) root.textContent = `Failed to start app: ${String(err)}`;
});
