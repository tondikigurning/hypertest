export function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: "Unable to process request." });
}
