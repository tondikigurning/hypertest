import assert from "node:assert/strict";
import test from "node:test";
import { createDriveApi } from "./drive-client.mjs";

test("lists all pages of media and forwards the range when downloading", async () => {
  const requests = [];
  const client = createDriveApi("token", async (url, options) => {
    requests.push({ url: new URL(url), headers: options.headers });
    if (requests.length === 1) {
      return Response.json({
        files: [
          { id: "a", mimeType: "image/png" },
          { id: "b", mimeType: "text/plain" },
        ],
        nextPageToken: "next",
      });
    }
    if (requests.length === 2) return Response.json({ files: [{ id: "c", mimeType: "video/mp4" }] });
    return new Response("clip", { status: 206 });
  });
  assert.deepEqual(
    (await client.listMedia("folder-1")).map((file) => file.id),
    ["a", "c"],
  );
  assert.equal(requests[0].url.searchParams.get("q"), "'folder-1' in parents and trashed = false");
  assert.equal(requests[1].url.searchParams.get("pageToken"), "next");
  assert.equal((await client.download("c", "bytes=0-3")).status, 206);
  assert.equal(requests[2].headers.Range, "bytes=0-3");
  assert.equal(requests[2].headers.Authorization, "Bearer token");
});

test("reports Drive API failures to its caller", async () => {
  const client = createDriveApi("token", async () => new Response(null, { status: 500 }));
  await assert.rejects(client.listMedia("folder"), /Drive list failed/);
  await assert.rejects(client.download("file"), /Drive download failed/);
});
