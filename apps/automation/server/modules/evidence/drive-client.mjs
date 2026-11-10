import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import dotenv from "dotenv";

const root = resolve(import.meta.dirname, "../../../../..");
const require = createRequire(resolve(root, "packages/internal/test-utils/package.json"));
const { GoogleAuth } = require("google-auth-library");
const env = {
  ...(existsSync(resolve(root, ".env.local")) ? dotenv.parse(readFileSync(resolve(root, ".env.local"))) : {}),
  ...process.env,
};

export async function createDriveClient() {
  const raw =
    env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    (env.GOOGLE_SERVICE_ACCOUNT_FILE && readFileSync(resolve(root, env.GOOGLE_SERVICE_ACCOUNT_FILE), "utf8"));
  if (!raw) return null;
  const auth = new GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  const token = await auth.getAccessToken();
  return createDriveApi(token, fetch, env.GOOGLE_DRIVE_FOLDER_ID);
}

export function createDriveApi(token, fetchRequest = fetch, parentFolderId = env.GOOGLE_DRIVE_FOLDER_ID) {
  const headers = { Authorization: `Bearer ${token}` };
  return {
    async findEvidenceFolder(segments) {
      if (!parentFolderId) throw new Error("Drive parent folder is not configured");
      let parent = parentFolderId;
      for (const name of ["E2E Evidence", ...segments]) {
        const escapeQuery = (value) => value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
        const params = new URLSearchParams({
          q: `'${escapeQuery(parent)}' in parents and name = '${escapeQuery(name)}' and trashed = false`,
          fields: "files(id,mimeType)",
          pageSize: "100",
          supportsAllDrives: "true",
          includeItemsFromAllDrives: "true",
        });
        const response = await fetchRequest(`https://www.googleapis.com/drive/v3/files?${params}`, { headers });
        if (!response.ok) throw new Error("Drive folder lookup failed");
        const data = await response.json();
        if (data.files.length > 1) throw new Error("Duplicate Drive folders");
        if (!data.files.length) return null;
        if (data.files[0].mimeType !== "application/vnd.google-apps.folder")
          throw new Error("Drive item is not a folder");
        parent = data.files[0].id;
      }
      return parent;
    },
    async listMedia(folder) {
      const files = [];
      let pageToken;
      do {
        const params = new URLSearchParams({
          q: `'${folder}' in parents and trashed = false`,
          fields: "nextPageToken,files(id,name,mimeType)",
          pageSize: "100",
          supportsAllDrives: "true",
          includeItemsFromAllDrives: "true",
        });
        if (pageToken) params.set("pageToken", pageToken);
        const response = await fetchRequest(`https://www.googleapis.com/drive/v3/files?${params}`, { headers });
        if (!response.ok) throw new Error("Drive list failed");
        const data = await response.json();
        files.push(...data.files.filter((file) => /^(image|video)\//.test(file.mimeType)));
        pageToken = data.nextPageToken;
      } while (pageToken);
      return files;
    },
    async download(id, range) {
      const response = await fetchRequest(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,
        { headers: { ...headers, ...(range && { Range: range }) } },
      );
      if (!response.ok) throw new Error("Drive download failed");
      return response;
    },
  };
}
