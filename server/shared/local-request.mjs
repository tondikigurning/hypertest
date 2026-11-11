export function isAllowedWebHost(host) {
  const port = process.env.AUTOMATION_WEB_PORT || "3110";
  const localWebHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);
  const configured = process.env.AUTOMATION_WEB_ALLOWED_HOSTS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedHosts = configured
    ? new Set([...localWebHosts, ...configured.map((value) => (value.includes(":") ? value : `${value}:${port}`))])
    : localWebHosts;
  return allowedHosts.has(host || "");
}

export function isLocalRequest(req) {
  return (
    isAllowedWebHost(req.headers.host) && ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)
  );
}
