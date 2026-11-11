import { lookup } from "node:dns/promises";
import { createServer as createHttpServer, request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import { connect as connectSocket, isIP } from "node:net";

function normalizedHostname(hostname) {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

async function resolveTarget(hostname) {
  const address = normalizedHostname(hostname);
  if (isIP(address)) return { address, family: isIP(address) };
  const addresses = await lookup(address, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("The selected target did not resolve to an address.");
  return addresses[0];
}

/** Start an HTTP proxy that can connect only to the selected target origin. */
export async function startTargetEgressProxy({ target, host = "127.0.0.1", port = 0 }) {
  let origin;
  try {
    origin = new URL(target);
  } catch {
    throw new Error("The selected target URL is invalid.");
  }
  if (!new Set(["http:", "https:"]).has(origin.protocol) || origin.username || origin.password)
    throw new Error("The selected target URL is invalid.");

  const expectedHost = normalizedHostname(origin.hostname);
  const expectedPort = Number(origin.port || (origin.protocol === "https:" ? 443 : 80));
  const activeSockets = new Set();
  function allowed(hostname, requestedPort, protocol) {
    const defaultPort = protocol === "https:" ? 443 : 80;
    return (
      protocol === origin.protocol &&
      normalizedHostname(hostname) === expectedHost &&
      Number(requestedPort || defaultPort) === expectedPort
    );
  }

  function rejectResponse(response, status, message) {
    response.writeHead(status, { "content-type": "text/plain; charset=utf-8", connection: "close" });
    response.end(message);
  }

  async function forwardHttp(request, response) {
    let url;
    try {
      url = new URL(request.url);
    } catch {
      rejectResponse(response, 400, "A full target URL is required.\n");
      return;
    }
    if (
      !new Set(["http:", "https:"]).has(url.protocol) ||
      url.username ||
      url.password ||
      !allowed(url.hostname, url.port, url.protocol)
    ) {
      rejectResponse(response, 403, "This agent session can reach only its selected target.\n");
      return;
    }

    try {
      const destination = await resolveTarget(url.hostname);
      const headers = { ...request.headers, host: url.host, connection: "close" };
      delete headers["proxy-authorization"];
      delete headers["proxy-connection"];
      const transport = url.protocol === "https:" ? requestHttps : requestHttp;
      const upstream = transport(
        {
          hostname: destination.address,
          family: destination.family,
          port: Number(url.port || (url.protocol === "https:" ? 443 : 80)),
          method: request.method,
          path: `${url.pathname}${url.search}`,
          headers,
          ...(url.protocol === "https:" && !isIP(url.hostname) ? { servername: url.hostname } : {}),
        },
        (upstreamResponse) => {
          response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
          upstreamResponse.pipe(response);
        },
      );
      upstream.once("socket", (socket) => {
        activeSockets.add(socket);
        socket.once("close", () => activeSockets.delete(socket));
      });
      upstream.setTimeout(30000, () => upstream.destroy(new Error("The target request timed out.")));
      upstream.on("error", () => {
        if (!response.headersSent) rejectResponse(response, 502, "The selected target could not be reached.\n");
        else response.destroy();
      });
      request.pipe(upstream);
    } catch {
      rejectResponse(response, 502, "The selected target could not be reached.\n");
    }
  }

  async function tunnelHttps(request, clientSocket, head) {
    let requestedHost;
    let requestedPort;
    try {
      const authority = new URL(`http://${request.url || ""}`);
      requestedHost = authority.hostname;
      requestedPort = Number(authority.port || 80);
      if (authority.pathname !== "/" || authority.search || authority.hash || authority.username || authority.password)
        throw new Error("Invalid CONNECT authority.");
    } catch {
      clientSocket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      return;
    }
    if (!allowed(requestedHost, requestedPort, "https:")) {
      clientSocket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }

    try {
      const destination = await resolveTarget(requestedHost);
      const upstream = connectSocket({ host: destination.address, family: destination.family, port: requestedPort });
      activeSockets.add(upstream);
      activeSockets.add(clientSocket);
      upstream.setTimeout(30000, () => upstream.destroy(new Error("The target tunnel timed out.")));
      upstream.once("connect", () => {
        clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length) upstream.write(head);
        upstream.pipe(clientSocket);
        clientSocket.pipe(upstream);
      });
      upstream.once("error", () => clientSocket.destroy());
      upstream.once("close", () => clientSocket.destroy());
      clientSocket.once("error", () => upstream.destroy());
      clientSocket.once("close", () => upstream.destroy());
    } catch {
      clientSocket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
    }
  }

  const server = createHttpServer((request, response) => void forwardHttp(request, response));
  server.maxConnections = 64;
  server.requestTimeout = 60000;
  server.on("connect", (request, socket, head) => void tunnelHttps(request, socket, head));
  server.on("connection", (socket) => {
    activeSockets.add(socket);
    socket.once("close", () => activeSockets.delete(socket));
  });
  server.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("The agent egress proxy did not start.");

  return {
    url: `http://${host.includes(":") ? `[${host}]` : host}:${address.port}`,
    async close() {
      for (const socket of activeSockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
