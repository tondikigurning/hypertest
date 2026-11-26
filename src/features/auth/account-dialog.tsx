import type { ReactNode, RefObject } from "react";
import { CloseButton, Modal } from "../../components";

export function AccountDialog({
  titleId,
  title,
  description,
  onClose,
  returnFocus,
  children,
}: {
  titleId: string;
  title: string;
  description: string;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <Modal className="group-run-dialog members-dialog" labelledBy={titleId} onClose={onClose} returnFocus={returnFocus}>
      <header className="members-dialog-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          <p className="members-description">{description}</p>
        </div>
        <CloseButton label={`Close ${title.toLowerCase()}`} onClick={onClose} />
      </header>
      {children}
    </Modal>
  );
}
