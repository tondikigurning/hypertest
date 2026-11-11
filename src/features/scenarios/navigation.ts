import type { Scenario } from "./scenario";

const base = "/";
const featureRoute = `${base}/features/`;

function encodeFeaturePath(file: string) {
  const bytes = new TextEncoder().encode(file);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeFeaturePath(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

export function navigationFromUrl(url: URL, catalog: Array<Scenario>) {
  const legacyFile = url.searchParams.get("submodule");
  const legacyModule = url.searchParams.get("module");
  let file: string | undefined;
  if (url.pathname.startsWith(featureRoute)) {
    const routeValue = url.pathname.slice(featureRoute.length);
    try {
      file = decodeFeaturePath(routeValue);
    } catch {
      // Accept the earlier readable feature path and migrate it to an extension-free route.
      try {
        file = routeValue.split("/").map(decodeURIComponent).join("/");
      } catch {
        file = undefined;
      }
    }
  } else if (legacyFile || legacyModule) {
    file = legacyFile ?? catalog.find((scenario) => scenario.module === legacyModule)?.file;
  }
  const feature = catalog.find((scenario) => scenario.file === file);
  return {
    featureFile: feature?.file,
    module: feature?.module,
    isHome: !feature,
    legacy: Boolean(legacyFile || legacyModule),
  };
}

export function writeNavigationUrl(_module?: string, submodule?: string, replace = false) {
  const url = new URL(window.location.href);
  url.pathname = submodule ? `${featureRoute}${encodeFeaturePath(submodule)}` : base;
  url.searchParams.delete("module");
  url.searchParams.delete("submodule");
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history[replace ? "replaceState" : "pushState"]({}, "", next);
  }
}
