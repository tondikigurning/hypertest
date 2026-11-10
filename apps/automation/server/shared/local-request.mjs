const localWebHosts = new Set(["localhost:3110", "127.0.0.1:3110"]);

export function isAllowedWebHost(host) {
  const configured = process.env.AUTOMATION_WEB_ALLOWED_HOSTS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return (configured ? new Set([...localWebHosts, ...configured.map((value) => `${value}:3110`)]) : localWebHosts).has(
    host || "",
  );
}

export function isLocalRequest(req) {
  return (
    isAllowedWebHost(req.headers.host) && ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)
  );
}
