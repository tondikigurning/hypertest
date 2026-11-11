import { CloseButton } from "../../../components";
import { EvidenceViewer } from "../../evidence/components/evidence-viewer";
import { DraftRun } from "../../runs/components/draft-run";
import { LocalRun } from "../../runs/components/local-run";
import { hasDistinctExpectedResult, type Scenario } from "../scenario";
import { RunStatus } from "./run-status";
import { ScenarioMetadata } from "./scenario-metadata";
import { ScenarioSteps } from "./scenario-steps";

export function ScenarioDetails({
  scenario,
  status,
  references,
  onClose,
  onOpenReference,
}: {
  scenario?: Scenario;
  status?: string;
  references: Array<{ id: string; matches: Array<Scenario> }>;
  onClose: () => void;
  onOpenReference: (scenario: Scenario) => void;
}) {
  return (
    <aside className="detail" aria-label="Scenario details">
      {scenario ? (
        <div className="detail-content" key={scenario.key}>
          <div className="detail-top">
            <span className="section-label">SCENARIO DETAILS</span>
            <CloseButton className="close" onClick={onClose} label="Close details" />
          </div>
          <div className="detail-id">{scenario.hasId ? scenario.id : "ID unavailable"}</div>
          <h2>{scenario.title}</h2>
          <div className="detail-metadata">
            <ScenarioMetadata scenario={scenario} />
          </div>
          <dl className="catalog-metadata">
            <div>
              <dt>Category</dt>
              <dd>{scenario.category || "Uncategorized"}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>{scenario.method || "—"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <RunStatus status={status} />
              </dd>
            </div>
            <div>
              <dt>Last run</dt>
              <dd>{scenario.lastRun || "—"}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{scenario.duration || "—"}</dd>
            </div>
          </dl>
          {scenario.examples && scenario.examples.length > 1 && (
            <details>
              <summary>Example results ({scenario.examples.length})</summary>
              <ul>
                {scenario.examples.map((example) => (
                  <li key={example.id}>
                    {example.title}: {example.status}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {!scenario.draft && (
            <EvidenceViewer
              scenario={scenario.key}
              label={scenario.evidenceLabel}
              title={scenario.title}
              scenarioId={scenario.id}
            />
          )}
          {hasDistinctExpectedResult(scenario) && (
            <>
              <h3>Expected result</h3>
              <p className="expect-text">{scenario.expect}</p>
            </>
          )}
          {references.length > 0 && (
            <>
              <h3>References</h3>
              <ul className="references">
                {references.map(({ id, matches }) => (
                  <li key={id}>
                    {matches.length === 1 ? (
                      <button type="button" onClick={() => onOpenReference(matches[0])}>
                        {id} <span>— {matches[0].title}</span>
                      </button>
                    ) : (
                      <span>
                        {id} — {matches.length ? "Multiple scenarios have this ID" : "Not found in this catalog"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {scenario.draftBefore && (
            <details>
              <summary>View the previous version</summary>
              <h3>{scenario.draftBefore.title}</h3>
              <ScenarioSteps background={scenario.draftBefore.background} steps={scenario.draftBefore.steps} />
            </details>
          )}
          <div className="divider" />
          <ScenarioSteps background={scenario.background} steps={scenario.steps} />
          {scenario.draft && scenario.draft !== "deleted" ? (
            <DraftRun key={scenario.key} scenario={scenario} />
          ) : scenario.availability === "unavailable" ? (
            <p className="execution-state">Execution unavailable: {scenario.availabilityReasons.join(" ")}</p>
          ) : (
            <>
              <div className="divider" />
              <LocalRun key={scenario.key} scenarioId={scenario.id} />
            </>
          )}
        </div>
      ) : (
        <div className="detail-empty">
          <div className="empty-icon">◇</div>
          <h2>Explore a scenario</h2>
          <p>Select a scenario to see its steps and details.</p>
        </div>
      )}
    </aside>
  );
}
