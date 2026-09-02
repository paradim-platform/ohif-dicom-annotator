import { Types } from '@ohif/core';
import conerstoneExtension from '@ohif/extension-cornerstone';
import { id } from './id';
import { Toolbox } from '@ohif/extension-default';
import { PanelSegmentation } from './components/PanelSegmentation';
import PatientPanel from './components/PatientPanel';
import React from 'react';

const segmentationWorkflowExtension: Types.Extensions.Extension = {
  ...conerstoneExtension,
  id,
  getPanelModule: ({ servicesManager, commandsManager, extensionManager }) => {

    const segmentationPanel = ({ configuration }) => {
      return (
        <>
          <PatientPanel servicesManager={servicesManager} />
          <Toolbox buttonSectionId="segmentationToolbox" title="Segmentation Tools" />
          <PanelSegmentation
            commandsManager={commandsManager}
            servicesManager={servicesManager}
            extensionManager={extensionManager}
            configuration={{
              ...configuration,
            }}
          />
        </>
      );
    };

    return [
      {
        name: 'panelSegmentationWorkflow',
        iconName: 'tab-segmentation',
        iconLabel: 'Segmentation Workflow',
        label: 'Segmentation Workflow',
        component: segmentationPanel,
      },
    ];
  },
};

export default segmentationWorkflowExtension;
