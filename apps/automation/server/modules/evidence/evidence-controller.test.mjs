import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, request } from "node:http";
import test from "node:test";
import { createDriveEvidenceHandler } from "./evidence-controller.mjs";

async function startServer(t, options) {
  const results = {
    list: async () => [
      {
        scenarioId: "TEN_TEST_E2E_001",
        runId: "run-1",
        uploadStatus: "uploaded",
        evidenceUrl: "https://drive.google.com/drive/folders/folder-1",
        examples: [{ title: "Example A", evidenceNames: ["image.png"] }],
      },
    ],
  };
  const server = createServer(createDriveEvidenceHandler({ results, ...options })).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  return (path, headers = {}) =>
    new Promise((resolve, reject) => {
      const req = request(
        { host: "127.0.0.1", port: server.address().port, path, headers: { host: "localhost:3110", ...headers } },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () =>
            resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }),
          );
        },
      );
      req.on("error", reject);
      req.end();
    });
}

const catalog = () => [{ key: "scenario", id: "TEN_TEST_E2E_001", docFile: "example/flow.md" }];

test("lists media from the selected scenario and only downloads files in its folder", async (t) => {
  const downloads = [];
  const send = await startServer(t, {
    catalog,
    drive: async () => ({
      async findEvidenceFolder(segments) {
        assert.deepEqual(segments, ["stt", "tenants", "example", "flow", "TEN_TEST_E2E_001", "run-1"]);
        return "folder-1";
      },
      async listMedia(folder) {
        assert.equal(folder, "folder-1");
        return [{ id: "image-1", name: "image.png", mimeType: "image/png" }];
      },
      async download(id, range) {
        downloads.push({ id, range });
        return new Response("image", { status: 206, headers: { "content-range": "bytes 0-4/5" } });
      },
    }),
  });
  const list = await send("/?scenario=scenario&environment=stt");
  assert.deepEqual(JSON.parse(list.body), [
    { id: "image-1", name: "image.png", mimeType: "image/png", exampleTitle: "Example A" },
  ]);
  assert.equal(list.headers["cache-control"], "no-store");
  assert.equal((await send("/?scenario=scenario&environment=stt&file=other")).status, 404);
  assert.equal(downloads.length, 0);
  const media = await send("/?scenario=scenario&environment=stt&file=image-1", { range: "bytes=0-4" });
  assert.equal(media.status, 206);
  assert.equal(media.body, "image");
  assert.equal(media.headers["content-type"], "image/png");
  assert.equal(media.headers["content-range"], "bytes 0-4/5");
  assert.deepEqual(downloads, [{ id: "image-1", range: "bytes=0-4" }]);
});

test("does not show files from an older run after evidence is unavailable or failed", async (t) => {
  let driveCalled = false;
  const send = await startServer(t, {
    catalog,
    results: { list: async () => [{ scenarioId: "TEN_TEST_E2E_001", uploadStatus: "failed", evidenceUrl: null }] },
    drive: async () => {
      driveCalled = true;
      return null;
    },
  });
  assert.deepEqual(JSON.parse((await send("/?scenario=scenario&environment=stt")).body), []);
  assert.equal((await send("/?scenario=scenario&environment=stt&file=old")).status, 404);
  assert.equal(driveCalled, false);
});

test("reports missing credentials and Drive failures without exposing error details", async (t) => {
  const missing = await startServer(t, { catalog, drive: async () => null });
  assert.equal((await missing("/?scenario=scenario&environment=stt")).status, 503);
  const failing = await startServer(t, {
    catalog,
    drive: async () => {
      throw new Error("private detail");
    },
  });
  const response = await failing("/?scenario=scenario&environment=stt");
  assert.equal(response.status, 502);
  assert.doesNotMatch(response.body, /private detail/);
});

test("uses the selected environment and never falls back to an unscoped folder", async (t) => {
  const paths = [];
  const send = await startServer(t, {
    catalog,
    drive: async () => ({
      async findEvidenceFolder(segments) {
        paths.push(segments);
        return null;
      },
    }),
  });
  assert.deepEqual(JSON.parse((await send("/?scenario=scenario&environment=dev")).body), []);
  assert.equal(paths[0][0], "dev");
  assert.equal((await send("/?scenario=scenario&environment=invalid")).status, 404);
  assert.equal((await send("/?scenario=scenario")).status, 404);
  assert.equal(paths.length, 1);
});
