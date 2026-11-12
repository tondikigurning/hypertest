import { type FormEvent, type ReactNode, type RefObject, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CloseButton,
  FormField,
  Modal,
  PrimaryButton,
  SectionEyebrow,
  Spinner,
  TextAreaInput,
  TextInput,
} from "../../components";
import { label } from "../scenarios/scenario";
import { PrdDocumentIcon } from "./components/prd-document-icon";
import { usePrdVersions } from "./use-prd-versions";
import type { Prd } from "./use-prds";
import "./prd.css";

interface PrdResult {
  items: Array<Prd>;
  error: string;
  loading: boolean;
}

const emptyPrd = "---\nstatus: draft\n---\n\n";

function VersionItem({
  name,
  status,
  active,
  selected,
  baseline,
  onSelect,
}: {
  name: string;
  status: string;
  active: boolean;
  selected: boolean;
  baseline?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={baseline ? "prd-baseline-item prd-version-item" : "prd-version-item"}
      data-selected={selected}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="prd-version-item-icon" aria-hidden="true">
        <PrdDocumentIcon />
      </span>
      <span className="prd-version-item-copy">
        <strong>{name}</strong>
        <small>{status}</small>
      </span>
      {active && <span className="prd-active-badge">Active</span>}
    </button>
  );
}

function PrdState({
  icon,
  title,
  children,
  role,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  role?: "status" | "alert";
}) {
  return (
    <div className="prd-state" role={role}>
      <span className="prd-state-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function EditorActions({ busy, label, onCancel }: { busy: boolean; label: string; onCancel: () => void }) {
  return (
    <div className="prd-version-actions">
      <button type="submit" className="prd-action-button prd-action-primary" disabled={busy}>
        {label}
      </button>
      <button type="button" className="prd-text-action" disabled={busy} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

export function PrdCatalog({
  module,
  submodule,
  checkout,
  draftPrds,
  draft,
  onCreate,
  onEdit,
  onClose,
  returnFocus,
}: {
  module: string;
  submodule: string;
  checkout: PrdResult;
  draftPrds: PrdResult;
  draft: string;
  onCreate: () => void;
  onEdit: () => void;
  onClose: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const versions = usePrdVersions(module, submodule, draft);
  const [selectedId, setSelectedId] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [name, setName] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<
    { kind: "discard"; proceed: () => void } | { kind: "delete"; id: string; name: string } | null
  >(null);
  const checkoutItem = checkout.items.find((entry) => entry.module === module && entry.submodule === submodule);
  const draftItem = draftPrds.items.find((entry) => entry.module === module && entry.submodule === submodule);
  const selectedVersion =
    selectedId === "__checkout__"
      ? undefined
      : (versions.items.find((version) => version.id === selectedId) ??
        versions.items.find((version) => version.active) ??
        versions.items[0]);
  const selectedContent =
    selectedVersion?.content ??
    (selectedId === "__checkout__"
      ? checkoutItem?.content
      : draft
        ? (draftItem?.content ?? checkoutItem?.content)
        : checkoutItem?.content);
  const isBaseline = !selectedVersion && !(selectedId !== "__checkout__" && draftItem);
  const hasContent = selectedContent !== undefined;
  const loading = versions.loading || checkout.loading || draftPrds.loading;
  const loadError = versions.error || draftPrds.error || checkout.error;
  const hasUnsavedChanges = editingContent
    ? contentDraft !== selectedVersion?.content
    : editingName && name !== selectedVersion?.name;
  function leaveEditor(proceed: () => void) {
    if (busy) return;
    if (hasUnsavedChanges) setConfirmation({ kind: "discard", proceed });
    else proceed();
  }
  function closeDialog() {
    if (busy) onClose();
    else leaveEditor(onClose);
  }
  const frontMatter = selectedContent?.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const markdown = frontMatter ? selectedContent?.slice(frontMatter[0].length) : selectedContent;
  const noVersions = !versions.loading && !versions.error && versions.items.length === 0;

  async function runAction(action: () => Promise<unknown>) {
    setActionError("");
    setBusy(true);
    try {
      await action();
      setEditingName(false);
      setEditingContent(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update PRD versions.");
    } finally {
      setBusy(false);
    }
  }

  async function createVersion() {
    const initialContent = draftItem?.content ?? checkoutItem?.content ?? emptyPrd;
    const result = (await versions.create("", initialContent)) as { activeVersionId?: string };
    if (result.activeVersionId) setSelectedId(result.activeVersionId);
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVersion) return;
    await runAction(async () => {
      await versions.update(selectedVersion.id, name);
    });
  }

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVersion) return;
    await runAction(async () => {
      await versions.update(selectedVersion.id, selectedVersion.name, contentDraft);
    });
  }

  async function activateVersion() {
    if (!selectedVersion) return;
    await runAction(async () => {
      await versions.activate(selectedVersion.id);
    });
  }

  async function deleteVersion(id: string) {
    await runAction(async () => {
      await versions.remove(id);
      setSelectedId("");
    });
  }

  function selectVersion(id: string) {
    leaveEditor(() => {
      setSelectedId(id);
      setEditingName(false);
      setEditingContent(false);
      setActionError("");
    });
  }

  function startRename() {
    if (!selectedVersion) return;
    setName(selectedVersion.name);
    setEditingName(true);
    setEditingContent(false);
    setActionError("");
  }

  function startContentEdit() {
    if (!selectedVersion) return;
    setContentDraft(selectedVersion.content);
    setEditingContent(true);
    setEditingName(false);
    setActionError("");
  }

  const hasValidatedRequirements = Boolean(
    selectedVersion?.content.split(/\r?\n/).some((line) => /\[validated\]/i.test(line)),
  );
  const canEditContent = Boolean(
    selectedVersion && selectedVersion.status.toLowerCase() !== "reviewed" && !hasValidatedRequirements,
  );

  return (
    <Modal className="prd-dialog" labelledBy="prd-dialog-title" onClose={closeDialog} returnFocus={returnFocus}>
      <header className="prd-dialog-header">
        <div className="prd-dialog-heading">
          <span className="prd-document-icon">
            <PrdDocumentIcon />
          </span>
          <div>
            <SectionEyebrow className="prd-kicker">PRODUCT REQUIREMENTS</SectionEyebrow>
            <h2 id="prd-dialog-title">{label(submodule)}</h2>
            <p>
              {label(module)} <span aria-hidden="true">/</span> {draft ? "Draft workspace" : "Checkout baseline"}
            </p>
          </div>
        </div>
        <CloseButton label="Close PRD" onClick={closeDialog} className="prd-close" />
      </header>

      <div className="prd-management-layout" aria-busy={loading || busy}>
        <aside className="prd-version-sidebar" aria-label="PRD versions">
          <div className="prd-version-sidebar-heading">
            <h3>Versions</h3>
            {draft && <span>{versions.items.length}</span>}
          </div>
          {draft && (
            <button
              type="button"
              className="prd-action-button prd-new-version"
              onClick={() => void runAction(createVersion)}
              disabled={busy || loading || Boolean(loadError) || hasUnsavedChanges}
            >
              + New version
            </button>
          )}
          {draft && versions.items.length > 0 && (
            <ul className="prd-version-list">
              {versions.items.map((version) => (
                <li key={version.id}>
                  <VersionItem
                    name={version.name}
                    status={version.status}
                    active={version.active}
                    selected={selectedVersion?.id === version.id}
                    onSelect={() => selectVersion(version.id)}
                  />
                </li>
              ))}
            </ul>
          )}
          {checkoutItem && (
            <div className="prd-baseline-group">
              <span className="prd-baseline-label">BASELINE</span>
              <VersionItem
                name="Checkout"
                status={checkoutItem.status}
                active={!draft}
                selected={selectedId === "__checkout__" || (isBaseline && !selectedId)}
                baseline
                onSelect={() => selectVersion("__checkout__")}
              />
            </div>
          )}
          {draft && noVersions && !checkoutItem && <p className="prd-version-empty">No versions yet.</p>}
        </aside>

        <div className="prd-version-content">
          {busy && (
            <p className="prd-review-note" role="status">
              Saving changes. If Q-Rex requests a review, close this window to review it in the agent panel.
            </p>
          )}
          {!loading && loadError && hasContent && (
            <p className="prd-action-error" role="alert">
              Some PRD data could not be loaded: {loadError}
            </p>
          )}
          {loading && !hasContent && (
            <PrdState icon={<Spinner />} title="Loading PRD" role="status">
              <p>Getting the latest document.</p>
            </PrdState>
          )}
          {!loading && loadError && !hasContent && (
            <PrdState icon="!" title="Could not load the PRD" role="alert">
              <p>{loadError}</p>
            </PrdState>
          )}
          {!loading && !loadError && !hasContent && (
            <PrdState icon={<PrdDocumentIcon />} title="No PRD yet">
              <p>Create or import a document to get started.</p>
              <PrimaryButton className="prd-primary" onClick={onCreate}>
                Create or import with Q-Rex
              </PrimaryButton>
            </PrdState>
          )}
          {actionError && !hasContent && (
            <p className="prd-action-error" role="alert">
              {actionError}
            </p>
          )}
          {hasContent && (
            <div className="prd-reader">
              <div className="prd-reader-heading">
                <div>
                  <div className="prd-version-title">
                    <h3>{selectedVersion?.name ?? label(submodule)}</h3>
                  </div>
                </div>
                <div className="prd-reader-controls">
                  <div className="prd-reader-badges">
                    {selectedVersion?.active && <span className="prd-active-badge">Active</span>}
                    {isBaseline && !draft && <span className="prd-active-badge">Active</span>}
                    {selectedVersion && (
                      <span className="prd-status" data-reviewed={selectedVersion.status.toLowerCase() === "reviewed"}>
                        <span className="prd-status-dot" aria-hidden="true" />
                        {selectedVersion.status}
                      </span>
                    )}
                  </div>
                  {selectedVersion && !editingContent && !editingName && (
                    <div className="prd-version-actions">
                      <button type="button" className="prd-action-button" onClick={startRename} disabled={busy}>
                        Rename
                      </button>
                      <button
                        type="button"
                        className="prd-action-button"
                        onClick={canEditContent ? startContentEdit : onEdit}
                        disabled={busy || (!canEditContent && !selectedVersion.active)}
                        title={
                          !canEditContent && !selectedVersion.active
                            ? "Set this version active before editing reviewed requirements with Q-Rex."
                            : undefined
                        }
                      >
                        {canEditContent ? "Edit content" : "Edit with Q-Rex"}
                      </button>
                      {!selectedVersion.active && (
                        <button
                          type="button"
                          className="prd-action-button"
                          onClick={() => void activateVersion()}
                          disabled={busy}
                        >
                          Set active
                        </button>
                      )}
                      <button
                        type="button"
                        className="prd-delete-button"
                        onClick={() =>
                          setConfirmation({ kind: "delete", id: selectedVersion.id, name: selectedVersion.name })
                        }
                        disabled={busy || (selectedVersion.active && versions.items.length > 1)}
                        title={
                          selectedVersion.active && versions.items.length > 1
                            ? "Set another version active before deleting this one."
                            : undefined
                        }
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {actionError && (
                <p className="prd-action-error" role="alert">
                  {actionError}
                </p>
              )}
              {editingContent && selectedVersion ? (
                <form className="prd-editor-form" onSubmit={(event) => void saveContent(event)}>
                  <p className="prd-review-note">
                    Saving reviewed content or adding validated requirements pauses for explicit PRD review in the Agent
                    panel.
                  </p>
                  <FormField label="PRD Markdown" htmlFor="prd-version-content">
                    <TextAreaInput
                      id="prd-version-content"
                      value={contentDraft}
                      onValueChange={setContentDraft}
                      rows={18}
                      spellCheck={false}
                      autoFocus
                    />
                  </FormField>
                  <EditorActions
                    busy={busy}
                    label="Save changes"
                    onCancel={() => {
                      leaveEditor(() => setEditingContent(false));
                    }}
                  />
                </form>
              ) : editingName && selectedVersion ? (
                <form className="prd-rename-form" onSubmit={(event) => void saveName(event)}>
                  <FormField label="Version name" htmlFor="prd-version-name">
                    <TextInput
                      id="prd-version-name"
                      value={name}
                      onValueChange={setName}
                      maxLength={80}
                      required
                      autoFocus
                    />
                  </FormField>
                  <EditorActions
                    busy={busy}
                    label="Save name"
                    onCancel={() => {
                      leaveEditor(() => setEditingName(false));
                    }}
                  />
                </form>
              ) : null}

              {selectedVersion?.active && !canEditContent && !editingContent && (
                <p className="prd-review-note">
                  Edit the active PRD with Q-Rex when it contains reviewed or validated requirements.
                </p>
              )}
              {frontMatter && !editingContent && (
                <div className="prd-frontmatter">
                  <strong>Document details</strong>
                  <pre>{frontMatter[1]}</pre>
                </div>
              )}
              {!editingContent && (
                <article className="prd-document">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{ img: ({ alt }) => <span>{alt || "Image"}</span> }}
                  >
                    {markdown || ""}
                  </ReactMarkdown>
                </article>
              )}
            </div>
          )}
        </div>
      </div>
      {confirmation && (
        <Modal className="prd-confirm-dialog" labelledBy="prd-confirm-title" onClose={() => setConfirmation(null)}>
          <h2 id="prd-confirm-title">{confirmation.kind === "delete" ? "Delete version?" : "Discard changes?"}</h2>
          <p>{confirmation.kind === "delete" ? confirmation.name : "Unsaved changes will be lost."}</p>
          <div className="prd-confirm-actions">
            <button type="button" className="prd-action-button" onClick={() => setConfirmation(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="prd-delete-button"
              onClick={() => {
                setConfirmation(null);
                if (confirmation.kind === "delete") void deleteVersion(confirmation.id);
                else confirmation.proceed();
              }}
            >
              {confirmation.kind === "delete" ? "Delete" : "Discard"}
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
