import type { IncomingMessage, ServerResponse } from "node:http";
import type { R2Storage } from "../../../packages/internal/test-utils/src/export/r2-client.mjs";

type EvidenceHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

export function createEvidenceHandler(options?: {
  catalog?: () => Array<{ key: string; evidenceUrl?: string }> | Promise<Array<{ key: string; evidenceUrl?: string }>>;
  r2?: () => R2Storage | null;
  results?: {
    list(environment: string): Promise<
      Array<{
        scenarioId: string;
        uploadStatus: string;
        evidenceUrl?: string;
        examples?: Array<{ evidenceNames?: Array<string>; title?: string }>;
      }>
    >;
  };
}): EvidenceHandler;
export function evidenceHandler(req: IncomingMessage, res: ServerResponse): Promise<void>;
