import { startTargetEgressProxy } from "./agent-egress-proxy-server.mjs";

const [hostname, portText, protocol] = process.argv.slice(2);
const port = Number(portText);

if (!hostname || !Number.isInteger(port) || port < 1 || port > 65535 || !new Set(["http:", "https:"]).has(protocol)) {
  process.stderr.write("The agent egress proxy configuration is invalid.\n");
  process.exit(1);
}

const target = new URL(`${protocol}//${hostname}:${port}/`);

try {
  await startTargetEgressProxy({
    target: target.href,
    host: process.env.AUTOMATION_AGENT_PROXY_HOST || "0.0.0.0",
    port: Number(process.env.AUTOMATION_AGENT_PROXY_PORT || 3128),
  });
  process.stdout.write("Agent egress proxy ready.\n");
} catch {
  process.stderr.write("The agent egress proxy could not start.\n");
  process.exit(1);
}
