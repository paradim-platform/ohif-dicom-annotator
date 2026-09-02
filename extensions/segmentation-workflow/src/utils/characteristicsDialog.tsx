import {
  CharacteristicsDialog,
  CharacteristicOptions,
  SelectedCharacteristicOption,
} from '../components/CharacteristicsDialog';

/**
 * Shows a dialog for selecting multiple characteristics
 * @param uiDialogService - Service for showing UI dialogs
 * @param characteristics - Array of characteristics to display in the dialog
 * @param title - Title text to show in dialog header
 * @returns The selected values as SelectedCharacteristics array
 */
export async function characteristicsDialog({
  uiDialogService,
  characteristicOptionsList,
  title = 'Edit segment characteristics',
  initialValues,
  initialComment,
  position,
}: {
  uiDialogService: AppTypes.UIDialogService;
  characteristicOptionsList: CharacteristicOptions[];
  title?: string;
  initialValues?: Record<string, string>;
  initialComment?: string;
  position?: { x: number; y: number };
}): Promise<SelectedCharacteristicOption[]> {
  const dialogId = 'dialog-characteristics';

  return await new Promise<SelectedCharacteristicOption[]>((resolve, reject) => {
    uiDialogService.show({
      id: dialogId,
      content: CharacteristicsDialog,
      title: title,
      shouldCloseOnEsc: true,
      defaultPosition: position,
      contentProps: {
        characteristicOptionsList,
        title,
        initialValues,
        initialComment,
        onSelect: value => {
          resolve(value);
        },
        onCancel: () => {
          reject(new Error('Selection cancelled'));
        },
      },
    });
  });
}
