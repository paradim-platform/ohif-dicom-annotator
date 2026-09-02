import dcmjs from 'dcmjs';
import { SegmentationCharacteristics } from '../../components/SegmentationTable/characteristicStore';

const { CodedConcept } = dcmjs.sr.coding;
const {
  CodeContentItem,
  ContainerContentItem,
  RelationshipTypes,
  TextContentItem,
  ImageContentItem,
} = dcmjs.sr.valueTypes;
const { StructuredReport } = dcmjs.derivations;

export function createDicomSRForSegmentation(
  segmentation,
  segmentationCharacteristics: SegmentationCharacteristics | undefined,
  authorName: string
) {
  const { dataset: segDataset } = segmentation;

  // Generate base SR
  const referencedDatasets = [segDataset];
  const sr = new StructuredReport(referencedDatasets);

  sr.dataset.SeriesDescription = 'Characteristics';

  sr.dataset.AuthorObserverSequence = [
    {
      InstitutionName: window.config?.['institutionName'] || '',
      InstitutionCodeSequence: [],
      ObserverType: 'PERSON',
      PersonName: authorName,
    },
  ];

  sr.dataset.CurrentRequestedProcedureEvidenceSequence = [
    {
      StudyInstanceUID: segDataset.StudyInstanceUID,
      ReferencedSeriesSequence: [
        {
          SeriesInstanceUID: segDataset.SeriesInstanceUID,
          ReferencedSOPSequence: [
            {
              ReferencedSOPClassUID: segDataset.SOPClassUID,
              ReferencedSOPInstanceUID: segDataset.SOPInstanceUID,
            },
          ],
        },
      ],
    },
  ];

  if (typeof sr.dataset.SpecificCharacterSet === 'undefined') {
    sr.dataset.SpecificCharacterSet = 'ISO_IR 192';
  }

  const rootContainer = makeContentSequence(segmentationCharacteristics, segDataset);
  sr.dataset.ConceptNameCodeSequence = rootContainer.ConceptNameCodeSequence;
  sr.dataset.RelationshipType = rootContainer.RelationshipType;
  sr.dataset.ContentSequence = rootContainer.ContentSequence;

  return sr;
}

function makeContentSequence(
  segmentationCharacteristics: SegmentationCharacteristics | undefined,
  segDataset
) {
  // TID 1500 - Measurement Report
  const rootContainer = new ContainerContentItem({
    name: new CodedConcept({
      value: '126000',
      schemeDesignator: 'DCM',
      meaning: 'Imaging Measurement Report',
    }),
    relationshipType: RelationshipTypes.CONTAINS,
    isContentContinuous: true,
  });

  // If there are no characteristics, return an empty content sequence.
  if (segmentationCharacteristics === undefined) {
    rootContainer.ContentSequence = [];
    return rootContainer;
  }

  const measurementGroups = segmentationCharacteristics.segments.map(segment => {
    // TID 1400 - Measurement Group for each segment
    const measurementGroup = new ContainerContentItem({
      name: new CodedConcept({
        value: '125007',
        schemeDesignator: 'DCM',
        meaning: 'Measurement Group',
      }),
      relationshipType: RelationshipTypes.CONTAINS,
    });

    const contentSequence = [];

    const referencedSegmentItem = new ImageContentItem({
      name: new CodedConcept({
        value: '121191',
        schemeDesignator: 'DCM',
        meaning: 'Referenced Segment',
      }),
      relationshipType: RelationshipTypes.CONTAINS,
      referencedSOPClassUID: segDataset.SOPClassUID,
      referencedSOPInstanceUID: segDataset.SOPInstanceUID,
    });

    // Manually add the ReferencedSegmentNumber.
    // The dcmjs ImageContentItem constructor does not seem to be adding the
    // ReferencedSegmentNumber tag, so we add it here.
    referencedSegmentItem.ReferencedSOPSequence[0].ReferencedSegmentNumber = parseInt(
      segment.segmentId,
      10
    );
    contentSequence.push(referencedSegmentItem);

    // Find the label characteristic.
    const labelCharacteristic = segment.characteristics.find(c => c.isSegmentationLabel);

    if (labelCharacteristic) {
      // TID 1402 Finding
      const finding = new CodeContentItem({
        name: new CodedConcept({
          value: '121071',
          schemeDesignator: 'SCT',
          meaning: 'Finding',
        }),
        value: new CodedConcept({
          value: labelCharacteristic.characteristic.value,
          schemeDesignator: labelCharacteristic.characteristic.schemeDesignator,
          meaning: labelCharacteristic.characteristic.meaning,
        }),
        relationshipType: RelationshipTypes.HAS_PROPERTIES,
      });
      contentSequence.push(finding);
    }

    // The rest are measurements
    const measurementCharacteristics = segment.characteristics.filter(c => !c.isSegmentationLabel);

    const measurements = measurementCharacteristics.map(selectedCharacteristic => {
      // TID 300 - Qualitative Evaluation
      const question = new CodedConcept(selectedCharacteristic.ConceptNameCodeSequence);
      const characteristic = selectedCharacteristic.characteristic;

      // If the characteristic has a value and a scheme designator, it is a coded concept.
      // Otherwise, it is a text answer.
      if (characteristic.value && characteristic.schemeDesignator) {
        const answer = new CodedConcept({
          value: characteristic.value,
          schemeDesignator: characteristic.schemeDesignator,
          meaning: characteristic.meaning,
        });

        return new CodeContentItem({
          name: question,
          value: answer,
          relationshipType: RelationshipTypes.CONTAINS,
        });
      }

      return new TextContentItem({
        name: question,
        value: characteristic,
        relationshipType: RelationshipTypes.CONTAINS,
      });
    });

    measurementGroup.ContentSequence = [...contentSequence, ...measurements];
    return measurementGroup;
  });

  rootContainer.ContentSequence = measurementGroups;

  return rootContainer;
}


