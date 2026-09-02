import { SelectDialog } from '../components/SelectDialog';

type SelectOption = {
  value: string;
  label: string;
};

interface SelectDialogDefaultProps {
  hide: () => void;
  onSelect: (value: string) => void;
  onCancel: () => void;
  options: SelectOption[];
  title?: string;
  placeholder?: string;
  defaultValue?: string;
}

/**
 * Shows a select dialog for choosing from a list of options
 * @param uiDialogService - Service for showing UI dialogs
 * @param options - Array of options to display in the select dropdown
 * @param defaultValue - Initial selected value
 * @param title - Title text to show in dialog header
 * @param placeholder - Placeholder text for select field
 * @returns The selected value
 */
export async function selectDialog({
  uiDialogService,
  options,
  defaultValue = '',
  title = 'Select an option',
  placeholder = 'Select an option',
}: {
  uiDialogService: AppTypes.UIDialogService;
  options: SelectOption[];
  defaultValue?: string;
  title?: string;
  placeholder?: string;
}) {
  const dialogId = 'dialog-select-option';

  const value = await new Promise<string>((resolve, reject) => {
    uiDialogService.show({
      id: dialogId,
      content: SelectDialog,
      title: title,
      shouldCloseOnEsc: true,
      contentProps: {
        options,
        defaultValue,
        placeholder,
        title,
        onSelect: value => {
          resolve(value);
        },
        onCancel: () => {
          reject(new Error('Selection cancelled'));
        },
      },
    });
  });

  return value;
}

export default selectDialog;
