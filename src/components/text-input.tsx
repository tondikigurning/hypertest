import type { InputHTMLAttributes } from "react";

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function TextInput({ onValueChange, ...props }: TextInputProps) {
  return <input {...props} onChange={(event) => onValueChange(event.currentTarget.value)} />;
}
