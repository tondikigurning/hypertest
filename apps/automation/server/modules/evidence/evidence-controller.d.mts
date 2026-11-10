import type { IncomingMessage, ServerResponse } from "node:http";

interface EvidenceFile {
  id: string;
  name: string;
  mimeType: string;
}
interface DriveClient {
  listMedia(folder: string): Promise<Array<EvidenceFile>>;
  download(id: string, range?: string): Promise<Response>;
}
type EvidenceHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

export function createDriveEvidenceHandler(options?: {
  catalog?: () => Array<{ key: string; evidenceUrl?: string }>;
  drive?: () => Promise<DriveClient | null>;
}): EvidenceHandler;
export function driveEvidence(req: IncomingMessage, res: ServerResponse): Promise<void>;
