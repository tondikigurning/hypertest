import { Icon } from "@hyperscal/icons";
import { type RefObject, useEffect, useState } from "react";
import { RetryButton, Spinner } from "../../components";
import { AccountDialog } from "./account-dialog";

interface PullRequest {
  number: number;
  title: string;
  url: string;
  status: string;
  branch?: string;
  baseBranch?: string;
  createdAt?: string;
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function PullRequestsDialog({
  onClose,
  returnFocus,
}: {
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const [items, setItems] = useState<Array<PullRequest>>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    // A new attempt restarts the cancellable request after a load failure.
    void attempt;
    const controller = new AbortController();
    fetch("/api/agent/pull-requests", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load pull requests.");
        return response.json() as Promise<Array<PullRequest>>;
      })
      .then((data) => {
        if (!controller.signal.aborted) setItems(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [attempt]);
  return (
    <AccountDialog
      titleId="pull-requests-title"
      title="Pull requests"
      description="Track changes shared from your workspace."
      onClose={onClose}
      returnFocus={returnFocus}
    >
      {error ? (
        <div className="pr-empty pr-error" role="alert">
          <h3>Couldn’t load pull requests</h3>
          <p>Check your connection to the local app and try again.</p>
          <RetryButton
            onRetry={() => {
              setError(false);
              setAttempt((value) => value + 1);
            }}
          />
        </div>
      ) : !items ? (
        <div className="pr-loading" role="status">
          <Spinner /> Loading pull requests…
        </div>
      ) : items.length ? (
        <section className="pr-history" aria-labelledby="pr-history-title">
          <div className="pr-history-heading">
            <h3 id="pr-history-title">Request history</h3>
            <span>
              {items.length} {items.length === 1 ? "request" : "requests"}
            </span>
          </div>
          <ul className="pr-history-list">
            {items.map((item) => {
              const date = formatDate(item.createdAt);
              return (
                <li className="pr-history-item" key={item.url}>
                  <div className="pr-history-main">
                    <div className="pr-history-meta">
                      <span>#{item.number}</span>
                      <span className="pr-status" data-status={item.status?.toLowerCase()}>
                        {item.status || "Unknown"}
                      </span>
                    </div>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.title || `Pull request #${item.number}`} <Icon name="external-link" aria-hidden="true" />
                      <span className="pr-sr-only"> (opens in a new tab)</span>
                    </a>
                    {((item.branch && item.baseBranch) || date) && (
                      <div className="pr-history-detail">
                        {item.branch && item.baseBranch && (
                          <span>
                            <code>{item.branch}</code> <span aria-hidden="true">→</span>
                            <span className="pr-sr-only"> into </span> <code>{item.baseBranch}</code>
                          </span>
                        )}
                        {date && (
                          <span>
                            Created <time dateTime={item.createdAt}>{date}</time>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className="pr-empty">
          <div className="pr-empty-art" aria-hidden="true">
            <div className="pr-empty-branch">
              <i />
              <i />
              <i />
            </div>
          </div>
          <h3>No pull requests yet</h3>
          <p>When changes are reviewed and shared with your team, their pull requests will appear here.</p>
          <div className="pr-empty-note">
            <span className="pr-empty-note-dot" aria-hidden="true" /> Create a pull request from Q-Rex after reviewing
            your changes.
          </div>
        </div>
      )}
    </AccountDialog>
  );
}
