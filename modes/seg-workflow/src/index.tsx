import { id } from './id';
import toolbarButtons from './toolbarButtons';
import initToolGroups from './initToolGroups';
import { useCharacteristicStore } from '../../../extensions/segmentation-workflow/src/components/SegmentationTable/characteristicStore';

const ohif = {
  layout: '@ohif/extension-default.layoutTemplateModule.viewerLayout',
  sopClassHandler: '@ohif/extension-default.sopClassHandlerModule.stack',
  hangingProtocol: '@ohif/extension-default.hangingProtocolModule.default',
  leftPanel: '@ohif/extension-default.panelModule.seriesList',
};

const cornerstone = {
  viewport: '@ohif/extension-cornerstone.viewportModule.cornerstone',
  segPanelTool: 'segmentation-workflow.panelModule.panelSegmentationWorkflow',
  // panelTool: '@ohif/extension-cornerstone.panelModule.panelSegmentationWithTools',
};

const segmentation = {
  sopClassHandler: '@ohif/extension-cornerstone-dicom-seg.sopClassHandlerModule.dicom-seg',
  viewport: '@ohif/extension-cornerstone-dicom-seg.viewportModule.dicom-seg',
};

const extensionDependencies = {
  '@ohif/extension-default': '^3.0.0',
  '@ohif/extension-cornerstone': '^3.0.0',
  '@ohif/extension-cornerstone-dicom-seg': '^3.0.0',
};

function modeFactory({ modeConfiguration }) {
  return {
    id,
    routeName: 'seg-workflow',
    displayName: 'Segmentation-workflow',
    onModeEnter: ({ servicesManager, extensionManager, commandsManager }: withAppTypes) => {
      // Retrieving services
      const { toolbarService, toolGroupService } = servicesManager.services;

      // Clear the characteristic store
      const { clear } = useCharacteristicStore.getState();
      clear();

      // Init Default and SR ToolGroups
      initToolGroups(extensionManager, toolGroupService, commandsManager);

      // Creates all button widgets
      toolbarService.addButtons(toolbarButtons);
      toolbarService.createButtonSection('primary', [
        'WindowLevel',
        'Pan',
        'Zoom',
        'TagBrowser',
        'Capture',
        'Layout',
        'MoreTools',
      ]);
      toolbarService.createButtonSection('moreToolsSection', [
        'Reset',
        'rotate-right',
        'flipHorizontal',
        'ReferenceLines',
        'ImageOverlayViewer',
        'Crosshairs',
        'StackScroll',
        'invert',
        'Cine',
        'Magnify',
        'TrackballRotate',
      ]);
      toolbarService.createButtonSection('segmentationToolbox', [
        'SegmentationUtilities',
        'SegmentationTools',
      ]);
      toolbarService.createButtonSection('segmentationToolboxUtilitySection', [
        'LabelmapSlicePropagation',
        'InterpolateLabelmap',
        'SegmentBidirectional',
      ]);
      toolbarService.createButtonSection('segmentationToolboxToolsSection', [
        'BrushTools',
        'MarkerLabelmap',
        'RegionSegmentPlus',
        'Shapes',
      ]);
      toolbarService.createButtonSection('brushToolsSection', ['Brush', 'Eraser', 'Threshold']);
    },
    onModeExit: ({ servicesManager }: withAppTypes) => {
      const {
        toolGroupService,
        syncGroupService,
        segmentationService,
        cornerstoneViewportService,
        uiDialogService,
        uiModalService,
      } = servicesManager.services;

      uiDialogService.hideAll();
      uiModalService.hide();
      toolGroupService.destroy();
      syncGroupService.destroy();
      segmentationService.destroy();
      cornerstoneViewportService.destroy();
    },
    validationTags: {
      study: [],
      series: [],
    },
    isValidMode: ({ modalities }) => {
      modalities = modalities.split('\\');

      if (modalities.includes('CT')) {
        return {
          valid: true,
          description: 'Segmentation-workflow only works for CT',
        };
      }
      return {
        valid: false,
        description: 'Segmentation-workflow only works for CT',
      };
    },
    /**
     * Mode Routes are used to define the mode's behavior. A list of Mode Route
     * that includes the mode's path and the layout to be used. The layout will
     * include the components that are used in the layout. For instance, if the
     * default layoutTemplate is used (id: '@ohif/extension-default.layoutTemplateModule.viewerLayout')
     * it will include the leftPanels, rightPanels, and viewports. However, if
     * you define another layoutTemplate that includes a Footer for instance,
     * you should provide the Footer component here too. Note: We use Strings
     * to reference the component's ID as they are registered in the internal
     * ExtensionManager. The template for the string is:
     * `${extensionId}.{moduleType}.${componentId}`.
     */
    routes: [
      {
        path: 'template',
        layoutTemplate: ({ location, servicesManager }) => {
          return {
            id: ohif.layout,
            props: {
              leftPanels: [ohif.leftPanel],
              leftPanelResizable: true,
              rightPanels: [cornerstone.segPanelTool],
              rightPanelResizable: true,
              leftPanelClosed: false,
              viewports: [
                {
                  namespace: cornerstone.viewport,
                  displaySetsToDisplay: [ohif.sopClassHandler],
                },
                {
                  namespace: segmentation.viewport,
                  displaySetsToDisplay: [segmentation.sopClassHandler],
                },
              ],
            },
          };
        },
      },
    ],
    /** List of extensions that are used by the mode */
    extensions: extensionDependencies,
    /** HangingProtocol used by the mode */
    // Commented out to just use the most applicable registered hanging protocol
    // The example is used for a grid layout to specify that as a preferred layout
    hangingProtocol: ['@ohif/mnGrid'],
    /** SopClassHandlers used by the mode */
    sopClassHandlers: [ohif.sopClassHandler, segmentation.sopClassHandler],
  };
}

const mode = {
  id,
  modeFactory,
  extensionDependencies,
};

export default mode;
