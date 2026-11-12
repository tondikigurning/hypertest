import { type ReactNode, useId } from "react";

interface SegmentedControlOption<Value extends string> {
  value: Value;
  label: ReactNode;
  disabled?: boolean;
}

export function SegmentedControl<Value extends string>({
  ariaLabel,
  className = "",
  options,
  value,
  onValueChange,
}: {
  ariaLabel: string;
  className?: string;
  options: Array<SegmentedControlOption<Value>>;
  value: Value;
  onValueChange: (value: Value) => void;
}) {
  const name = useId();
  return (
    <fieldset className={["segmented-control", className].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      {options.map((option) => (
        <label className="segmented-control-option" key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={() => onValueChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
