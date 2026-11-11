import { type ReactNode, type RefObject, useEffect, useRef } from "react";

interface ModalProps {
  children: ReactNode;
  className: string;
  labelledBy: string;
  onClose: () => void;
  returnFocus?: RefObject<HTMLElement | null>;
}

export function Modal({ children, className, labelledBy, onClose, returnFocus }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      returnFocus?.current?.focus();
    };
  }, [returnFocus]);

  return (
    <dialog
      ref={dialog}
      className={className}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}
