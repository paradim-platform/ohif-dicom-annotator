import { helpers } from '@cornerstonejs/adapters';
import { createDicomSEG } from './dicom/seg';
import { createDicomSRForSegmentation } from './dicom/sr';
import {
  SegmentationCharacteristics,
  SegmentCharacteristics,
} from '../components/SegmentationTable/characteristicStore';
import { retrieveUserName, toDICOMPN } from './dicom/utils';

const { downloadDICOMData } = helpers;

export function onSegmentationComplete(
  segmentationId: string,
  segmentationCharacteristics: SegmentationCharacteristics | undefined,
  activeDatasource,
  serviceManager,
  download: boolean = false
) {
  // Generate SEG
  // ------------
  console.log('Generate SEG ....');
  const { segmentationService, uiNotificationService } = serviceManager.services;

  const segmentation = createDicomSEG(segmentationId, {}, segmentationService);
  const segDataset = segmentation.dataset;
  segDataset.SeriesDescription = 'Segmentation';
  console.log('Generate SEG .... done.');

  // Generate SR
  // ------------
  console.log('Generate SR ....');
  // We re-assign the segmentCharacteristics index so that it becomes in order.
  // We need to do this because when the DICOM SEG is written, the Segment index is not used,
  // The resulting SegmentNumber (index) is simply the number order of the segment in the
  // segment object (essentially, they do an `enumerate`).
  // See the discussion here (https://github.com/dcmjs-org/dcmjs/issues/339)
  if (segmentationCharacteristics !== undefined) {
    segmentationCharacteristics.segments = segmentationCharacteristics.segments.map(
      (segmentCharacteristics: SegmentCharacteristics, index: number) => ({
        segmentId: String(index + 1),
        characteristics: segmentCharacteristics.characteristics,
      })
    );
  }

  const userName = retrieveUserName();
  const authorName = toDICOMPN(userName) || 'UNKNOWN^AUTHOR';
  const sr = createDicomSRForSegmentation(segmentation, segmentationCharacteristics, authorName);
  const srDataset = sr.dataset;
  console.log('Generate SR .... done.');

  // If the CT StudyID==='', ohif add "No Study ID". This revert to the original value.
  // ---------------------------------------------
  if (segDataset.StudyID === 'No Study ID') {
    segDataset.StudyID = '';
  }
  if (srDataset.StudyID === 'No Study ID') {
    srDataset.StudyID = '';
  }

  segDataset.ContentCreatorName = authorName;

  // Store SEG and SR
  // ------------
  if (download) {
    const timestamp = new Date().toISOString().slice(0, 10);

    downloadDICOMData(segDataset, `seg_${timestamp}.dcm`);
    downloadDICOMData(srDataset, `sr_${timestamp}.dcm`);
  } else {
    activeDatasource.store.dicom(segDataset);
    activeDatasource.store.dicom(srDataset);
  }

  uiNotificationService.show({
    title: 'On Segmentation Complete',
    message: 'Segmentation complete',
    type: 'success',
  });
}
