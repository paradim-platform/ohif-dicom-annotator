import React, { useCallback, useState } from 'react';
import {
  Input,
  InputDialog,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ohif/ui-next';

export type Characteristic = {
  value: string;
  schemeDesignator: string;
  meaning: string;
  rbgValues?: number[];
};

export type ConceptNameCodeSequence = {
  value: string;
  schemeDesignator: string;
  meaning: string;
};

// In this, a combination of the question key (ConceptNameCodeSequence "{schemeDesignator}-{value}")
// and the selected answer (Characteristic "{schemeDesignator}-{value}")
type DependsOnAnswer = [string, string];

export type CharacteristicOptions = {
  ConceptNameCodeSequence: ConceptNameCodeSequence;
  choices?: Characteristic[];
  isSegmentationLabel?: boolean;
  dependsOn?: DependsOnAnswer[];
};

export type SelectedCharacteristicOption = {
  ConceptNameCodeSequence: ConceptNameCodeSequence;
  isSegmentationLabel?: boolean;
  characteristic: Characteristic | string;
};

type CharacteristicsDialogProps = {
  title: string;
  characteristicOptionsList: CharacteristicOptions[];
  hide: () => void;
  onSelect: (value: SelectedCharacteristicOption[]) => void;
  onCancel: () => void;
  initialValues?: Record<string, string>;
  initialComment?: string;
};

export function CharacteristicsDialog({
  title = 'Edit the segmentation characteristics',
  characteristicOptionsList = [],
  hide,
  onSelect,
  onCancel,
  initialValues,
  initialComment,
}: CharacteristicsDialogProps) {
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(initialValues);
  const [comment, setComment] = useState(initialComment || '');

  const handleValueChange = useCallback((characteristicKey: string, value: string) => {
    setSelectedValues(prev => ({
      ...prev,
      [characteristicKey]: value,
    }));
  }, []);

  const handleSelect = useCallback(() => {
    // Create array of selected characteristics
    const characteristics: SelectedCharacteristicOption[] = characteristicOptionsList
      .map(characteristicOptions => {
        const { ConceptNameCodeSequence } = characteristicOptions;
        const key = `${ConceptNameCodeSequence.schemeDesignator}-${ConceptNameCodeSequence.value}`;
        const selectedValue = selectedValues[key];
        const selectedOption = characteristicOptions.choices.find(
          opt => `${opt.schemeDesignator}-${opt.value}` === selectedValue
        );

        if (!selectedOption) {
          return undefined;
        }

        return {
          ConceptNameCodeSequence: characteristicOptions.ConceptNameCodeSequence,
          isSegmentationLabel: characteristicOptions.isSegmentationLabel,
          characteristic: selectedOption,
        } as SelectedCharacteristicOption; // Explicitly cast to resolve TS error
      })
      .filter((char): char is SelectedCharacteristicOption => char !== undefined);

    // Add comment here
    if (comment) {
      characteristics.push({
        ConceptNameCodeSequence: {
          value: '121106',
          schemeDesignator: 'DCM',
          meaning: 'Comment',
        },
        characteristic: comment,
      });
    }

    onSelect(characteristics);
    hide();
  }, [selectedValues, hide, onSelect, characteristicOptionsList, comment]);

  const handleCancel = useCallback(() => {
    onCancel();
    hide();
  }, [onCancel, hide]);

  // Helper to determine if a characteristic option should be displayed
  const shouldDisplayCharacteristic = useCallback(
    (characteristicOption: CharacteristicOptions): boolean => {
      const { dependsOn } = characteristicOption;
      if (!dependsOn || dependsOn.length === 0) {
        return true; // No dependencies, always display
      }

      // Check if any of the dependencies are met
      return dependsOn.some(([dependentKey, dependentValue]) => {
        // dependentKey format: ConceptNameCodeSequence "{schemeDesignator}-{value}"
        // selectedValue format: Characteristic "{schemeDesignator}-{value}"
        return selectedValues[dependentKey] === dependentValue;
      });
    },
    [selectedValues]
  );

  // to set defaults for newly visible fields and clear hidden ones.
  React.useEffect(() => {
    const newSelectedValues = { ...selectedValues };
    let changed = false;

    characteristicOptionsList.forEach(characteristicOptions => {
      const { ConceptNameCodeSequence } = characteristicOptions;
      const key = `${ConceptNameCodeSequence.schemeDesignator}-${ConceptNameCodeSequence.value}`;

      const isDisplayed = shouldDisplayCharacteristic(characteristicOptions);
      const isSelected = newSelectedValues[key] !== undefined;

      if (isDisplayed && !isSelected && characteristicOptions.choices.length > 0) {
        // If it should be displayed, but no value is selected, set a default.
        const { schemeDesignator, value } = characteristicOptions.choices[0];
        newSelectedValues[key] = `${schemeDesignator}-${value}`;
        changed = true;
      } else if (!isDisplayed && isSelected) {
        // If it should not be displayed, but has a value, clear it.
        delete newSelectedValues[key];
        changed = true;
      }
    });

    if (changed) {
      setSelectedValues(newSelectedValues);
    }
  }, [selectedValues, characteristicOptionsList, shouldDisplayCharacteristic]);

  return (
    <div className="text-foreground flex max-h-[80vh] min-w-[400px] max-w-md flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 pr-4">
          {characteristicOptionsList.map(characteristicOptions => {
            const { ConceptNameCodeSequence } = characteristicOptions;
            const key = `${ConceptNameCodeSequence.schemeDesignator}-${ConceptNameCodeSequence.value}`;

            if (!shouldDisplayCharacteristic(characteristicOptions)) {
              return null; // Don't render if dependencies are not met
            }

            return (
              <div
                key={key}
                className="flex flex-col gap-2"
              >
                <div className="text-sm">{ConceptNameCodeSequence.meaning}</div>
                <Select
                  value={selectedValues[key]}
                  onValueChange={value => handleValueChange(key, value)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={`Select ${ConceptNameCodeSequence.meaning.toLowerCase()}`}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {characteristicOptions.choices.map(option => {
                      const { schemeDesignator, value, meaning } = option;
                      const itemValue = `${schemeDesignator}-${value}`;
                      return (
                        <SelectItem
                          key={itemValue}
                          value={itemValue}
                        >
                          {meaning}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
          <div className="flex flex-col gap-2">
            <div className="text-sm">Comment</div>
            <Input
              type="text"
              placeholder="[Optional]"
              value={comment}
              onChange={e => setComment(e.target.value)}
            ></Input>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-shrink-0 justify-end gap-2">
        <InputDialog>
          <InputDialog.Actions>
            <InputDialog.ActionsSecondary onClick={handleCancel}>
              Cancel
            </InputDialog.ActionsSecondary>
            <InputDialog.ActionsPrimary onClick={handleSelect}>Save</InputDialog.ActionsPrimary>
          </InputDialog.Actions>
        </InputDialog>
      </div>
    </div>
  );
}
