import { Icon } from "@hyperscal/icons";

interface CloseButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export function CloseButton({ label, onClick, className = "evidence-close" }: CloseButtonProps) {
  return (
    <button type="button" className={className} onClick={onClick} aria-label={label}>
      <Icon name="x" aria-hidden="true" className="close-icon" />
    </button>
  );
}
