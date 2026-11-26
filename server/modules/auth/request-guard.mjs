import { isLocalRequest } from "../../shared/local-request.mjs";

export function requireLocalSameOrigin(req, res, next) {
  res.setHeader("Cache-Control", "no-store");
  if (!isLocalRequest(req)) return res.status(403).json({ error: "Local requests only." });
  if (!["GET", "HEAD"].includes(req.method) && req.headers.origin !== `http://${req.headers.host}`)
    return res.status(403).json({ error: "Invalid request origin." });
  return next();
}
