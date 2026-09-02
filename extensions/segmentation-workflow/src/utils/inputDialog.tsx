import React from 'react';
import { setAnnotationLabel } from '@cornerstonejs/tools/utilities';
import { annotation } from '@cornerstonejs/tools';
import { LabellingFlow } from '@ohif/ui-next';
import { InputDialog } from '@ohif/ui-next';

interface InputDialogDefaultProps {
  hide: () => void;
  onSave: (value: string) => void;
  placeholder: string;
  defaultValue: string;
  submitOnEnter: boolean;
}

function InputDialogDefault({
  hide,
  onSave,
  placeholder = 'Enter value',
  defaultValue = '',
  submitOnEnter,
}: InputDialogDefaultProps) {
  return (
    <InputDialog
      submitOnEnter={submitOnEnter}
      defaultValue={defaultValue}
    >
      <InputDialog.Field>
        <InputDialog.Input placeholder={placeholder} />
      </InputDialog.Field>
      <InputDialog.Actions>
        <InputDialog.ActionsSecondary onClick={hide}>Cancel</InputDialog.ActionsSecondary>
        <InputDialog.ActionsPrimary
          onClick={value => {
            onSave(value);
            hide();
          }}
        >
          Save
        </InputDialog.ActionsPrimary>
      </InputDialog.Actions>
    </InputDialog>
  );
}

/**
 * Shows an input dialog for entering text with customizable options
 * @param uiDialogService - Service for showing UI dialogs
 * @param onSave - Callback function called when save button is clicked with entered value
 * @param defaultValue - Initial value to show in input field
 * @param title - Title text to show in dialog header
 * @param placeholder - Placeholder text for input field
 * @param submitOnEnter - Whether to submit dialog when Enter key is pressed
 */
export async function inputDialog({
  uiDialogService,
  defaultValue = '',
  title = 'Annotation',
  placeholder = '',
  submitOnEnter = true,
}: {
  uiDialogService: AppTypes.UIDialogService;
  defaultValue?: string;
  title?: string;
  placeholder?: string;
  submitOnEnter?: boolean;
}) {
  const dialogId = 'dialog-enter-annotation';

  const value = await new Promise<string>(resolve => {
    uiDialogService.show({
      id: dialogId,
      content: InputDialogDefault,
      title: title,
      shouldCloseOnEsc: true,
      contentProps: {
        onSave: value => {
          resolve(value);
        },
        placeholder,
        defaultValue,
        submitOnEnter,
      },
    });
  });

  return value;
}

export default inputDialog;
