import { create } from 'zustand';
import { SelectedCharacteristicOption } from '../CharacteristicsDialog';

export interface SegmentCharacteristics {
  segmentId: string;
  characteristics: SelectedCharacteristicOption[];
}

export interface SegmentationCharacteristics {
  segmentationId: string;
  segments: SegmentCharacteristics[];
}

export interface CharacteristicStoreType {
  segmentations: SegmentationCharacteristics[];
  setSegmentCharacteristics: (
    segmentationId: string,
    segmentId: string,
    characteristics: SelectedCharacteristicOption[]
  ) => void;
  getSegmentCharacteristics: (
    segmentationId: string,
    segmentId: string
  ) => SelectedCharacteristicOption[] | undefined;
  deleteSegmentCharacteristics: (segmentationId: string, segmentId: string) => void;
  clear: () => void;
}

export const useCharacteristicStore = create<CharacteristicStoreType>((set, get) => ({
  segmentations: [],
  setSegmentCharacteristics: (segmentationId, segmentId, characteristics) =>
    set(state => {
      const segmentationIndex = state.segmentations.findIndex(
        s => s.segmentationId === segmentationId
      );

      if (segmentationIndex === -1) {
        return {
          segmentations: [
            ...state.segmentations,
            {
              segmentationId,
              segments: [{ segmentId, characteristics }],
            },
          ],
        };
      }

      const updatedSegmentations = [...state.segmentations];
      const segmentIndex = updatedSegmentations[segmentationIndex].segments.findIndex(
        s => s.segmentId === segmentId
      );

      if (segmentIndex === -1) {
        updatedSegmentations[segmentationIndex].segments.push({
          segmentId,
          characteristics,
        });
      } else {
        updatedSegmentations[segmentationIndex].segments[segmentIndex].characteristics =
          characteristics;
      }

      return { segmentations: updatedSegmentations };
    }),
  getSegmentCharacteristics: (segmentationId, segmentId) => {
    const segmentation = get().segmentations.find(s => s.segmentationId === segmentationId);
    if (segmentation) {
      const segment = segmentation.segments.find(s => s.segmentId === segmentId);
      if (segment) {
        return segment.characteristics;
      }
    }
    return undefined;
  },
  deleteSegmentCharacteristics: (segmentationId, segmentId) =>
    set(state => {
      const updatedSegmentations = [...state.segmentations];
      const segmentationIndex = updatedSegmentations.findIndex(
        s => s.segmentationId === segmentationId
      );

      if (!updatedSegmentations[segmentationIndex]?.segments) {
        return { segmentations: updatedSegmentations };
      }

      const segments = updatedSegmentations[segmentationIndex].segments;

      updatedSegmentations[segmentationIndex].segments = segments.filter(
        segment => segment.segmentId !== segmentId
      );

      return { segmentations: updatedSegmentations };
    }),
  clear: () => set({ segmentations: [] }),
}));
