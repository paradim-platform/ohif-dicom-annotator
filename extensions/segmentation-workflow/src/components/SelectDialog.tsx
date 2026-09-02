import React, { useCallback, useState } from 'react';
import { InputDialog } from '@ohif/ui-next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ohif/ui-next';

type SelectOption = {
  value: string;
  label: string;
};

type SelectDialogProps = {
  title?: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  hide: () => void;
  onSelect: (value: string) => void;
  onCancel: () => void;
};

function SelectDialog({
  title = 'Select an option',
  options,
  defaultValue,
  placeholder = 'Select an option',
  hide,
  onSelect,
  onCancel,
}: SelectDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue || '');

  const handleSelect = useCallback(() => {
    onSelect(selectedValue);
    hide();
  }, [selectedValue, hide, onSelect]);

  const handleCancel = useCallback(() => {
    onCancel();
    hide();
  }, [onCancel, hide]);

  return (
    <div className="text-foreground flex min-w-[400px] max-w-md flex-col">
      <div className="flex flex-col gap-4">
        <div className="mb-1 pl-1 text-base">{title}</div>
        <div className="flex gap-4">
          <div className="w-full">
            <Select value={selectedValue} onValueChange={setSelectedValue}>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <InputDialog>
            <InputDialog.Actions>
              <InputDialog.ActionsSecondary onClick={handleCancel}>
                Cancel
              </InputDialog.ActionsSecondary>
              <InputDialog.ActionsPrimary onClick={handleSelect}>Select</InputDialog.ActionsPrimary>
            </InputDialog.Actions>
          </InputDialog>
        </div>
      </div>
    </div>
  );
}

export { SelectDialog };
export default SelectDialog;
