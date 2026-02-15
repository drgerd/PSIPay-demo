import type { AppConfig } from "./api/config";
import { Dashboard } from "./pages/Dashboard";

type AppProps = {
  config: AppConfig;
};

export default function App({ config }: AppProps) {
  return <Dashboard config={config} />;
}
