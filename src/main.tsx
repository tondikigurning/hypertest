import "@hyperscal/tailwind-config/backoffice.css";
import "@hyperscal/icons/icon.css";
import "./styles/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Fragment } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createBrowserRouter, redirect } from "react-router";
import { RouterProvider } from "react-router/dom";
import { App } from "./app/app";
import { DraftRunsProvider } from "./features/runs/draft-runs-context";
import { RunEnvironmentProvider } from "./features/runs/run-environment-context";
import { RunMonitorProvider } from "./features/runs/run-monitor-context";

const routeMarker = <Fragment />;

// Keep the app shell mounted while these leaf routes identify the active view.
const router = createBrowserRouter([
  {
    id: "app",
    Component: App,
    children: [
      { id: "home", index: true, element: routeMarker },
      { id: "scenario", path: ":module/:submodule", element: routeMarker },
    ],
  },
  { path: "*", loader: () => redirect("/") },
]);

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
          <RouterProvider router={router} />
        </DraftRunsProvider>
      </RunMonitorProvider>
    </RunEnvironmentProvider>
  </QueryClientProvider>,
);
