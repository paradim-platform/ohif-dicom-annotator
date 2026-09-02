import { characteristicsDialog } from '../utils/characteristicsDialog';
import {
  CharacteristicOptions,
  SelectedCharacteristicOption,
} from '../components/CharacteristicsDialog';
import { ServicesManager } from '@ohif/core/src';
import { useCharacteristicStore } from '../components/SegmentationTable/characteristicStore';

export function editSegment(
  segmentationId: string,
  segmentIndex: number,
  servicesManager: ServicesManager,
  position: { x: number; y: number }
) {
  const { segmentationService, uiDialogService } = servicesManager.services;
  const segmentation = segmentationService.getSegmentation(segmentationId);

  if (!segmentation) {
    return;
  }

  const characteristicOptionsList: CharacteristicOptions[] =
    window.config['characteristicOptionsList'];

  validateCharacteristicOptionsList(characteristicOptionsList);

  const { getSegmentCharacteristics } = useCharacteristicStore.getState();
  const segmentId = String(segmentIndex);
  const existingCharacteristics = getSegmentCharacteristics(segmentationId, segmentId);

  const initialValues = {};
  let initialComment = '';

  if (existingCharacteristics) {
    existingCharacteristics.forEach(char => {
      const { ConceptNameCodeSequence, characteristic } = char;
      if (typeof characteristic === 'string') {
        initialComment = characteristic;
      } else {
        const key = `${ConceptNameCodeSequence.schemeDesignator}-${ConceptNameCodeSequence.value}`;
        initialValues[key] = `${characteristic.schemeDesignator}-${characteristic.value}`;
      }
    });
  }

  characteristicsDialog({
    uiDialogService,
    characteristicOptionsList,
    title: 'Edit Segmentation Characteristics',
    initialValues,
    initialComment,
    position,
  })
    .then((selectedCharacteristics: SelectedCharacteristicOption[]) => {
      const labelCharacteristic = selectedCharacteristics.find(c => c.isSegmentationLabel);

      if (labelCharacteristic) {
        // Apply the suggested label for segment
        segmentationService.setSegmentLabel(
          segmentationId,
          segmentIndex,
          labelCharacteristic.characteristic.meaning
        );

        // Apply the suggested color for a segment if they exists
        const rbgColors = labelCharacteristic.characteristic?.rbgValues;
        if (rbgColors) {
          const { viewportGridService } = servicesManager.services;
          const viewportId = viewportGridService.getState().activeViewportId;

          const color = [rbgColors[0], rbgColors[1], rbgColors[2], 0.7 * 255.0];
          segmentationService.setSegmentColor(viewportId, segmentationId, segmentIndex, color);
        }
      }

      // Update the segment characteristics
      const { setSegmentCharacteristics } = useCharacteristicStore.getState();
      const segmentId = String(segmentIndex);

      setSegmentCharacteristics(segmentationId, segmentId, selectedCharacteristics);
    })
    .catch(error => {
      console.log('Characteristics selection cancelled:', error);
    });
}

function validateCharacteristicOptionsList(characteristicOptionsList: CharacteristicOptions[]) {
  // Validate that all options have at least one choice
  characteristicOptionsList.forEach(option => {
    if (option.choices.length === 0) {
      throw new Error(`Option "${option.ConceptNameCodeSequence.meaning}" has no choices`);
    }
  });

  // Validate that there is at least one option with isSegmentationLabel set to true
  const segmentationLabelOption = characteristicOptionsList.find(
    option => option.isSegmentationLabel === true
  );
  if (!segmentationLabelOption) {
    throw new Error(
      'No option with isSegmentationLabel set to true found. This is needed to set the segmentation label.'
    );
  }
}
