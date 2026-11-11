import "@hyperscal/tailwind-config/backoffice.css";
import "@hyperscal/icons/icon.css";
import "./styles/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot, type Root } from "react-dom/client";
import { App } from "./app/app";
import { DraftRunsProvider } from "./features/runs/draft-runs-context";
import { RunEnvironmentProvider } from "./features/runs/run-environment-context";
import { RunMonitorProvider } from "./features/runs/run-monitor-context";

if (window.location.pathname === "/automation/") {
  window.history.replaceState(window.history.state, "", `/automation${window.location.search}${window.location.hash}`);
}

const rootContainer = document.getElementById("root");
if (!rootContainer) throw new Error("Automation root element was not found.");
const rootCache = window as Window & { __automationReactRoot?: Root };
const reactRoot = rootCache.__automationReactRoot ?? createRoot(rootContainer);
rootCache.__automationReactRoot = reactRoot;
const queryClient = new QueryClient();
reactRoot.render(
  <QueryClientProvider client={queryClient}>
    <RunEnvironmentProvider>
      <RunMonitorProvider>
        <DraftRunsProvider>
          <App />
        </DraftRunsProvider>
      </RunMonitorProvider>
    </RunEnvironmentProvider>
  </QueryClientProvider>,
);
