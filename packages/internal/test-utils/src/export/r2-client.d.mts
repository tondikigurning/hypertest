export type R2ConfigResult =
  | { status: "missing" }
  | { status: "invalid"; error: string }
  | {
      status: "configured";
      config: {
        accountId: string;
        accessKeyId: string;
        secretAccessKey: string;
        bucket: string;
        endpoint: string;
      };
    };

export interface R2Object {
  Key?: string;
  Size?: number;
  LastModified?: Date;
}

export interface R2Storage {
  bucket: string;
  list(prefix: string): Promise<Array<R2Object>>;
  put(input: {
    key: string;
    body: Buffer;
    contentType: string;
    runId: string;
    scenarioId: string;
    environment: string;
  }): Promise<void>;
  remove(keys: Array<string>): Promise<void>;
  signDownload(key: string, downloadName?: string): Promise<string>;
  close(): void;
}

export function resolveR2Config(): R2ConfigResult;
export function r2EvidencePrefix(
  environment: string,
  app: string,
  relativeFeaturePath: string,
  scenarioId: string,
): string;
export function intermediateR2EvidencePrefix(
  environment: string,
  app: string,
  relativeFeaturePath: string,
  scenarioId: string,
): string;
export function legacyR2EvidencePrefix(
  environment: string,
  app: string,
  relativeFeaturePath: string,
  scenarioId: string,
): string;
export function r2EvidenceLocation(bucket: string, prefix: string): string;
export function parseR2EvidenceLocation(location: string): { bucket: string; prefix: string } | null;
export function createR2Storage(configResult?: R2ConfigResult): R2Storage | null;
