import type { Run } from "./types";

export interface DraftEvidence {
  key: string;
  contentType: string;
  title: string;
  blob: Blob;
}
export interface SavedDraftRun {
  id: string;
  taskId: string;
  scenarioId: string;
  target: string;
  digest: string;
  status: string;
  error?: string;
  savedAt: string;
  evidence: Array<DraftEvidence>;
}
export type DraftRunState = Run & { taskId: string; digest: string };

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("automation-draft-evidence", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("runs", { keyPath: "id" });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
export async function saveDraftRun(run: SavedDraftRun): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("runs", "readwrite");
      transaction.objectStore("runs").put(run);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
export async function listDraftRuns(taskId: string, scenarioId?: string): Promise<Array<SavedDraftRun>> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("runs", "readonly").objectStore("runs").getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () =>
        resolve(
          (request.result as Array<SavedDraftRun>)
            .filter((item) => item.taskId === taskId && (!scenarioId || item.scenarioId === scenarioId))
            .sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
        );
    });
  } finally {
    db.close();
  }
}
