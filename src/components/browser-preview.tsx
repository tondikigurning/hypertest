import { useEffect, useState } from "react";

export function BrowserPreview({
  url,
  done = false,
  label = "Starting browser",
  fetchFrame = fetch,
}: {
  url: string;
  done?: boolean;
  label?: string;
  fetchFrame?: typeof fetch;
}) {
  const [frame, setFrame] = useState<string>();
  useEffect(() => {
    if (done) return;
    let active = true;
    let objectUrl: string | undefined;
    let etag = "";
    let timer: number;
    const controller = new AbortController();
    const refresh = async () => {
      if (document.hidden) {
        timer = window.setTimeout(refresh, 1000);
        return;
      }
      try {
        const response = await fetchFrame(url, {
          signal: controller.signal,
          cache: "no-store",
          headers: etag ? { "If-None-Match": etag } : {},
        });
        if (
          active &&
          response.ok &&
          response.status !== 204 &&
          response.headers.get("content-type")?.startsWith("image/")
        ) {
          const blob = await response.blob();
          if (active) {
            const next = URL.createObjectURL(blob);
            const decoded = new Image();
            decoded.src = next;
            await decoded.decode().catch(() => {});
            if (!active) {
              URL.revokeObjectURL(next);
              return;
            }
            etag = response.headers.get("etag") || "";
            setFrame(next);
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            objectUrl = next;
          }
        }
      } catch {
        /* The run can finish or the dialog can close between polls. */
      }
      if (active) timer = window.setTimeout(refresh, 250);
    };
    void refresh();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setFrame(undefined);
    };
  }, [url, done, fetchFrame]);
  return (
    <div className={frame && !done ? "live-screen has-frame" : "live-screen"}>
      {frame && !done ? (
        <img src={frame} alt="Live browser view" />
      ) : (
        <div className="live-placeholder">
          <span>{done ? "✓" : "◌"}</span>
          <strong>{done ? "Live preview ended" : label}</strong>
          <p>
            {done
              ? "See the run results and evidence in scenario details."
              : "The browser view appears when execution starts."}
          </p>
        </div>
      )}
    </div>
  );
}
