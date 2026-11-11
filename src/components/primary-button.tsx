import type { ButtonHTMLAttributes } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export function PrimaryButton({ className = "", type = "button", children, ...props }: PrimaryButtonProps) {
  return (
    <button type={type} className={["primary-button", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </button>
  );
}
