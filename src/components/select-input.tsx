import { Icon } from "@hyperscal/icons";
import * as Select from "@radix-ui/react-select";
import type { ReactNode } from "react";

interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface SelectInputBaseProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

interface SelectInputProps extends SelectInputBaseProps {
  id?: string;
  placeholder?: ReactNode;
  options?: Array<SelectOption>;
  portalContainer?: HTMLElement | null;
}

export function SelectInput(props: SelectInputProps) {
  const { id, label, value, placeholder, options = [], onChange, disabled = false, portalContainer } = props;
  return (
    <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger id={id} aria-label={label} className="filter-select">
        <Select.Value placeholder={placeholder} />
        <Select.Icon aria-hidden="true">
          <Icon name="chevron-down" className="filter-select-chevron" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalContainer}>
        <Select.Content className="filter-select-content" position="popper" sideOffset={4}>
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="filter-select-option"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="filter-select-check" aria-hidden="true">
                  <Icon name="check" className="filter-select-check-icon" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
