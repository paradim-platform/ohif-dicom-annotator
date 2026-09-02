import { adaptersSEG } from '@cornerstonejs/adapters';
import { segmentation as cornerstoneToolsSegmentation } from '@cornerstonejs/tools';
import { cache, metaData } from '@cornerstonejs/core';
import dcmjs from 'dcmjs';

const { generateSegmentation } = adaptersSEG.Cornerstone3D.Segmentation;

export function createDicomSEG(segmentationId: string, options: object, segmentationService) {
  const segmentation = cornerstoneToolsSegmentation.state.getSegmentation(segmentationId);

  const { imageIds } = segmentation.representationData.Labelmap;

  const segImages = imageIds.map(imageId => cache.getImage(imageId));
  const referencedImages = segImages.map(image => cache.getImage(image.referencedImageId));
  const labelmaps2D = [];

  let z = 0;

  for (const segImage of segImages) {
    const segmentsOnLabelmap = new Set();
    const pixelData = segImage.getPixelData();
    const { rows, columns } = segImage;

    // Use a single pass through the pixel data
    for (let i = 0; i < pixelData.length; i++) {
      const segment = pixelData[i];
      if (segment !== 0) {
        segmentsOnLabelmap.add(segment);
      }
    }

    labelmaps2D[z++] = {
      segmentsOnLabelmap: Array.from(segmentsOnLabelmap),
      pixelData,
      rows,
      columns,
    };
  }

  const allSegmentsOnLabelmap = labelmaps2D.map(labelmap => labelmap.segmentsOnLabelmap);

  const labelmap3D = {
    segmentsOnLabelmap: Array.from(new Set(allSegmentsOnLabelmap.flat())),
    metadata: [],
    labelmaps2D,
  };

  const segmentationInOHIF = segmentationService.getSegmentation(segmentationId);
  const representations = segmentationService.getRepresentationsForSegmentation(segmentationId);

  Object.entries(segmentationInOHIF.segments).forEach(([segmentIndex, segment]) => {
    // segmentation service already has a color for each segment
    if (!segment) {
      return;
    }

    const { label } = segment;

    const firstRepresentation = representations[0];
    const color = segmentationService.getSegmentColor(
      firstRepresentation.viewportId,
      segmentationId,
      segment.segmentIndex
    );

    const RecommendedDisplayCIELabValue = dcmjs.data.Colors.rgb2DICOMLAB(
      color.slice(0, 3).map(value => value / 255)
    ).map(value => Math.round(value));

    const segmentMetadata = {
      SegmentNumber: segmentIndex.toString(),
      SegmentLabel: label,
      SegmentAlgorithmType: segment?.algorithmType || 'MANUAL',
      SegmentAlgorithmName: segment?.algorithmName || 'OHIF Brush',
      RecommendedDisplayCIELabValue,
      SegmentedPropertyCategoryCodeSequence: {
        CodeValue: 'T-D0050',
        CodingSchemeDesignator: 'SRT',
        CodeMeaning: 'Tissue',
      },
      SegmentedPropertyTypeCodeSequence: {
        CodeValue: 'T-D0050',
        CodingSchemeDesignator: 'SRT',
        CodeMeaning: 'Tissue',
      },
    };
    labelmap3D.metadata[segmentIndex] = segmentMetadata;
  });

  const generatedSegmentation = generateSegmentation(
    referencedImages,
    labelmap3D,
    metaData,
    options
  );

  return generatedSegmentation;
}
