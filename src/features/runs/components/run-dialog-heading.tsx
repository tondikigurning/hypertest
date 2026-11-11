import type { ReactNode } from "react";
import { CloseButton } from "../../../components";

interface RunDialogHeadingProps {
  titleId: string;
  title: string;
  description: string;
  closeLabel: string;
  onClose: () => void;
  kicker?: ReactNode;
}

export function RunDialogHeading({ titleId, title, description, closeLabel, onClose, kicker }: RunDialogHeadingProps) {
  return (
    <div className="group-run-heading">
      <div className="group-run-heading-copy">
        {kicker && <span className="group-run-kicker">{kicker}</span>}
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
      </div>
      <CloseButton onClick={onClose} label={closeLabel} />
    </div>
  );
}
