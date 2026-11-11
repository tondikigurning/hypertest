import { closeSync, openSync, readSync, statSync } from "node:fs";
import { applyRunEvent, createRunProgress, interruptRun } from "./run-progress.mjs";

/** Consume complete appended lines once; retain partial UTF-8 bytes until the next poll. */
export function createRunEventReader(file) {
  let offset = 0;
  let pending = Buffer.alloc(0);
  let state = createRunProgress();
  return (done = false, finishedAt) => {
    let size = 0;
    try {
      size = statSync(file).size;
    } catch {
      // The reporter creates the file when execution begins.
    }
    if (size < offset) {
      offset = 0;
      pending = Buffer.alloc(0);
      state = createRunProgress();
    }
    if (size > offset) {
      const fd = openSync(file, "r");
      try {
        const bytes = Buffer.alloc(size - offset);
        const count = readSync(fd, bytes, 0, bytes.length, offset);
        offset += count;
        pending = Buffer.concat([pending, bytes.subarray(0, count)]);
        let end = pending.indexOf(10);
        while (end !== -1) {
          const line = pending.subarray(0, end).toString("utf8");
          pending = pending.subarray(end + 1);
          if (line) {
            try {
              state = applyRunEvent(state, JSON.parse(line));
            } catch {
              // Ignore malformed reporter lines without discarding later events.
            }
          }
          end = pending.indexOf(10);
        }
      } finally {
        closeSync(fd);
      }
    }
    if (done && !state.finishedAt) state = interruptRun(state, finishedAt);
    return state;
  };
}
