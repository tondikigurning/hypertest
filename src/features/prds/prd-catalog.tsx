import { type FormEvent, type ReactNode, type RefObject, useState } from "react";
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
import { PrdMarkdown } from "./components/prd-markdown";
import { usePrdVersions } from "./use-prd-versions";
import type { Prd } from "./use-prds";
import "./prd.css";

interface PrdResult {
  items: Array<Prd>;
  error: string;
  loading: boolean;
}

const emptyPrd = "";

function displayContent(content: string, menu: string) {
  const markdown = content.replace(/^---\s*\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
  return markdown.replace(/^\s*#\s+([^\r\n]+)\r?\n/, (heading, title: string) => {
    const normalizedTitle = title
      .trim()
      .replace(/\s+prd$/i, "")
      .toLowerCase();
    return normalizedTitle === label(menu).toLowerCase() ? "" : heading;
  });
}

function ActionIcon({ name }: { name: "rename" | "edit" | "agent" | "delete" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "rename" && <path d="M4 7V4h16v3M12 4v16M8 20h8" />}
      {name === "edit" && <path d="M4 20h4l11-11-4-4L4 16v4ZM13.5 6.5l4 4" />}
      {name === "agent" && (
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
      )}
      {name === "delete" && <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />}
    </svg>
  );
}

function VersionItem({
  name,
  active,
  selected,
  onSelect,
}: {
  name: string;
  active: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="prd-version-item"
      data-selected={selected}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="prd-version-item-icon" aria-hidden="true">
        <PrdDocumentIcon />
      </span>
      <span className="prd-version-item-copy">
        <strong>{name}</strong>
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
  menu,
  draftPrds,
  draft,
  onCreate,
  onEdit,
  onClose,
  returnFocus,
}: {
  module: string;
  menu: string;
  draftPrds: PrdResult;
  draft: string;
  onCreate: () => void;
  onEdit: () => void;
  onClose: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const versions = usePrdVersions(module, menu, draft);
  const [selectedId, setSelectedId] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [showEditorPreview, setShowEditorPreview] = useState(false);
  const [name, setName] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<
    { kind: "discard"; proceed: () => void } | { kind: "delete"; id: string; name: string } | null
  >(null);
  const draftItem = draftPrds.items.find((entry) => entry.module === module && entry.menu === menu);
  const selectedVersion =
    versions.items.find((version) => version.id === selectedId) ??
    versions.items.find((version) => version.active) ??
    versions.items[0];
  const selectedContent = selectedVersion?.content ?? draftItem?.content;
  const hasContent = selectedContent !== undefined;
  const loading = versions.loading || draftPrds.loading;
  const loadError = versions.error || draftPrds.error;
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
  const documentContent = selectedContent === undefined ? "" : displayContent(selectedContent, menu);
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
    const initialContent = draftItem?.content ?? emptyPrd;
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
      await versions.update(selectedVersion.id, undefined, contentDraft, selectedVersion.content);
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
    setShowEditorPreview(false);
    setEditingName(false);
    setActionError("");
  }

  function downloadPrd() {
    if (selectedContent === undefined) return;
    const filename = [module, menu, selectedVersion?.name]
      .filter(Boolean)
      .join("-")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/-+$/g, "");
    const url = URL.createObjectURL(new Blob([selectedContent], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename || "prd"}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Modal className="prd-dialog" labelledBy="prd-dialog-title" onClose={closeDialog} returnFocus={returnFocus}>
      <header className="prd-dialog-header">
        <div className="prd-dialog-heading">
          <span className="prd-document-icon">
            <PrdDocumentIcon />
          </span>
          <div>
            <SectionEyebrow className="prd-kicker">PRODUCT REQUIREMENTS</SectionEyebrow>
            <h2 id="prd-dialog-title">{label(menu)}</h2>
            <p>{label(module)}</p>
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
                    active={version.active}
                    selected={selectedVersion?.id === version.id}
                    onSelect={() => selectVersion(version.id)}
                  />
                </li>
              ))}
            </ul>
          )}
          {draft && noVersions && <p className="prd-version-empty">No versions yet.</p>}
        </aside>

        <div className="prd-version-content">
          {busy && (
            <p className="prd-review-note" role="status">
              Saving changes…
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
                    <h3>{selectedVersion?.name ?? label(menu)}</h3>
                  </div>
                </div>
                <div className="prd-reader-controls">
                  {selectedVersion && !editingContent && !editingName && (
                    <div className="prd-version-actions">
                      <button
                        type="button"
                        className="prd-icon-action"
                        onClick={startRename}
                        disabled={busy}
                        aria-label="Rename version"
                        title="Rename version"
                      >
                        <ActionIcon name="rename" />
                      </button>
                      <button
                        type="button"
                        className="prd-icon-action"
                        onClick={startContentEdit}
                        disabled={busy}
                        aria-label="Edit content"
                        title="Edit content"
                      >
                        <ActionIcon name="edit" />
                      </button>
                      <button
                        type="button"
                        className="prd-icon-action"
                        onClick={onEdit}
                        disabled={busy || !selectedVersion.active}
                        aria-label="Edit with Q-Rex"
                        title={
                          selectedVersion.active ? "Edit with Q-Rex" : "Set this version active to edit with Q-Rex"
                        }
                      >
                        <ActionIcon name="agent" />
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
                        className="prd-icon-action prd-icon-delete"
                        onClick={() =>
                          setConfirmation({ kind: "delete", id: selectedVersion.id, name: selectedVersion.name })
                        }
                        disabled={busy || (selectedVersion.active && versions.items.length > 1)}
                        aria-label="Delete version"
                        title={
                          selectedVersion.active && versions.items.length > 1
                            ? "Set another version active before deleting this one."
                            : "Delete version"
                        }
                      >
                        <ActionIcon name="delete" />
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
                  <fieldset className="prd-editor-tabs">
                    <legend>Document view</legend>
                    <button type="button" aria-pressed={!showEditorPreview} onClick={() => setShowEditorPreview(false)}>
                      Markdown
                    </button>
                    <button type="button" aria-pressed={showEditorPreview} onClick={() => setShowEditorPreview(true)}>
                      Preview
                    </button>
                  </fieldset>
                  {showEditorPreview ? (
                    <div className="prd-editor-preview">
                      <PrdMarkdown content={displayContent(contentDraft, menu)} />
                    </div>
                  ) : (
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
                  )}
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

              {!editingContent && <PrdMarkdown content={documentContent || ""} />}
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
