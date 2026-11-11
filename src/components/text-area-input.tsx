import type { Ref, TextareaHTMLAttributes } from "react";

export type TextAreaInputProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  value: string;
  onValueChange: (value: string) => void;
  ref?: Ref<HTMLTextAreaElement>;
};

export function TextAreaInput({ onValueChange, ref, ...props }: TextAreaInputProps) {
  return <textarea {...props} ref={ref} onChange={(event) => onValueChange(event.currentTarget.value)} />;
}
