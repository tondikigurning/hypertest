import { Icon } from "@hyperscal/icons";
import * as Select from "@radix-ui/react-select";

interface FilterSelectProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function FilterSelect({ label, value, options, onChange, disabled = false }: FilterSelectProps) {
  return (
    <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger aria-label={label} className="filter-select">
        <Select.Value />
        <Select.Icon aria-hidden="true">
          <Icon name="chevron-down" className="filter-select-chevron" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="filter-select-content" position="popper" sideOffset={4}>
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value} className="filter-select-option">
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
