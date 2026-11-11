import type { IncomingMessage, ServerResponse } from "node:http";
import type { R2Storage } from "../../../packages/internal/test-utils/src/export/r2-client.mjs";

interface EvidenceFile {
  id: string;
  name: string;
  mimeType: string;
}
interface DriveClient {
  findEvidenceFolder(segments: Array<string>): Promise<string | null>;
  listMedia(folder: string): Promise<Array<EvidenceFile>>;
  download(id: string, range?: string): Promise<Response>;
}
type EvidenceHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

export function createDriveEvidenceHandler(options?: {
  catalog?: () => Array<{ key: string; evidenceUrl?: string }>;
  drive?: () => Promise<DriveClient | null>;
  r2?: () => R2Storage | null;
}): EvidenceHandler;
export function driveEvidence(req: IncomingMessage, res: ServerResponse): Promise<void>;
