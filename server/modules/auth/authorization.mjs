import { workspacePrincipal } from "./auth-routes.mjs";
import { requireLocalSameOrigin } from "./request-guard.mjs";

export function mayUseApi(user, method, path) {
  if (!user || user.mustChangePassword) return false;
  if (user.role === "engineer") return true;
  if (user.role !== "viewer") return false;
  if (
    method === "GET" &&
    (path === "/api/agent/checkout-flow-document" ||
      path === "/api/agent/prds" ||
      path === "/api/agent/prd-versions" ||
      path === "/api/agent/pull-requests")
  )
    return true;
  if (path.startsWith("/api/agent/")) return false;
  if (
    method === "GET" &&
    (path === "/api/scenarios" ||
      path === "/api/scenarios/snapshot" ||
      path.startsWith("/api/evidence/") ||
      path === "/api/evidence" ||
      ["/api/local/config", "/api/local/run", "/api/local/live", "/api/local/evidence"].includes(path))
  )
    return true;
  return method === "POST" && (path === "/api/local/run" || path === "/api/local/cancel");
}

export function createAuthorization({ resolvePrincipal = workspacePrincipal } = {}) {
  return (req, res, next) =>
    requireLocalSameOrigin(req, res, async () => {
      try {
        const user = await resolvePrincipal(req);
        if (!user) return res.status(401).json({ error: "Sign in required." });
        if (!mayUseApi(user, req.method, req.path)) return res.status(403).json({ error: "Not permitted." });
        req.workspacePrincipal = user;
        return next();
      } catch (error) {
        return next(error);
      }
    });
}
