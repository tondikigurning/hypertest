/** A PRD identifier always names a module and its menu. */
export function prdIdentity(path) {
  const match = /^docs\/prd\/([A-Za-z0-9][A-Za-z0-9_-]{0,63})\/([A-Za-z0-9][A-Za-z0-9_-]{0,63})\.md$/i.exec(
    path.replaceAll("\\", "/"),
  );
  return match ? { module: match[1], menu: match[2] } : undefined;
}
