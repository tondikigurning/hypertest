import type { ReactNode } from "react";

export function FormField({ label, htmlFor, children }: { label: ReactNode; htmlFor: string; children: ReactNode }) {
  return (
    <label className="form-field" htmlFor={htmlFor}>
      <span className="form-field-label">{label}</span>
      {children}
    </label>
  );
}
