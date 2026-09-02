import React, { useEffect } from 'react';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  Icons,
  useSegmentationTableContext,
  useSegmentationExpanded,
} from '@ohif/ui-next';
import { useTranslation } from 'react-i18next';
import { useSystem } from '@ohif/core/src';

import { onSegmentationComplete } from '../../services/onSegmentationComplete';
import { SegmentationCharacteristics, useCharacteristicStore } from './characteristicStore';

/**
 * Custom dropdown menu component for segmentation panel that uses context for data
 */
export const CustomDropdownMenuContent = () => {
  const { commandsManager, extensionManager, servicesManager } = useSystem();

  const activeDataSource = extensionManager.getActiveDataSource()[0];
  const { t } = useTranslation('SegmentationTable');
  const characteristicStore = useCharacteristicStore();
  const {
    onSegmentationAdd,
    onSegmentationRemoveFromViewport,
    onSegmentationEdit,
    onSegmentationDelete,
    exportOptions,
    activeSegmentation,
    activeSegmentationId,
  } = useSegmentationTableContext('CustomDropdownMenu');

  // Try to get segmentation data from expanded context first, fall back to table context
  let segmentation;
  let segmentationId;
  let allowExport = false;

  try {
    // Try to get from expanded context
    const context = useSegmentationExpanded();
    segmentation = context.segmentation;
    segmentationId = segmentation.segmentationId;
  } catch (e) {
    // If not in expanded context, fallback to active segmentation from table context
    segmentation = activeSegmentation;
    segmentationId = activeSegmentationId;
  }

  // Determine if export is allowed for this segmentation
  if (exportOptions && segmentationId) {
    const exportOption = exportOptions.find(opt => opt.segmentationId === segmentationId);
    allowExport = exportOption?.isExportable || false;
  }

  if (!segmentation || !segmentationId) {
    return null;
  }

  const actions = {
    onSegmentationComplete: (segmentationId: string) => {
      const segmentationCharacteristics = characteristicStore.segmentations.find(
        (segmentationChar: SegmentationCharacteristics) => {
          return segmentationChar.segmentationId === segmentationId;
        }
      );

      onSegmentationComplete(
        segmentationId,
        segmentationCharacteristics,
        activeDataSource,
        servicesManager,
        false
      );
    },
    onSegmentationCompleteDownload: (segmentationId: string) => {
      const segmentationCharacteristics = characteristicStore.segmentations.find(
        (segmentationChar: SegmentationCharacteristics) => {
          return segmentationChar.segmentationId === segmentationId;
        }
      );

      onSegmentationComplete(
        segmentationId,
        segmentationCharacteristics,
        activeDataSource,
        servicesManager,
        true
      );
    },
    storeSegmentation: async segmentationId => {
      commandsManager.run({
        commandName: 'storeSegmentation',
        commandOptions: { segmentationId },
        context: 'CORNERSTONE',
      });
    },
    onSegmentationDownloadRTSS: segmentationId => {
      commandsManager.run('downloadRTSS', { segmentationId });
    },
    onSegmentationDownload: segmentationId => {
      commandsManager.run('downloadSegmentation', { segmentationId });
    },
    downloadCSVSegmentationReport: segmentationId => {
      commandsManager.run('downloadCSVSegmentationReport', { segmentationId });
    },
  };

  return (
    <DropdownMenuContent align="start">
      <DropdownMenuLabel>{t('Manage Current Segmentation')}</DropdownMenuLabel>

      <DropdownMenuItem
        onClick={e => {
          e.preventDefault();
          actions.onSegmentationComplete(segmentationId);
        }}
      >
        <Icons.Export className="text-foreground" />
        <span className="pl-2">{t('Complete Segmentation')}</span>
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={e => {
          e.preventDefault();
          actions.onSegmentationCompleteDownload(segmentationId);
        }}
      >
        <Icons.Export className="text-foreground" />
        <span className="pl-2">{t('Complete and Download')}</span>
      </DropdownMenuItem>

      <DropdownMenuItem onClick={() => onSegmentationEdit(segmentationId)}>
        <Icons.Rename className="text-foreground" />
        <span className="pl-2">{t('Rename')}</span>
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="pl-1">
          <Icons.Export className="text-foreground" />
          <span className="pl-2">{t('Download & Export')}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent>
            <DropdownMenuLabel className="flex items-center pl-0">
              <Icons.Download className="h-5 w-5" />
              <span className="pl-1">{t('Download')}</span>
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={e => {
                e.preventDefault();
                actions.downloadCSVSegmentationReport(segmentationId);
              }}
            >
              {t('CSV Report')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={e => {
                e.preventDefault();
                actions.onSegmentationDownload(segmentationId);
              }}
              disabled={!allowExport}
            >
              {t('DICOM SEG')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={e => {
                e.preventDefault();
                actions.onSegmentationDownloadRTSS(segmentationId);
              }}
              disabled={!allowExport}
            >
              {t('DICOM RTSS')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center pl-0">
              <Icons.Export className="h-5 w-5" />
              <span className="pl-1 pt-1">{t('Export')}</span>
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={e => {
                e.preventDefault();
                actions.storeSegmentation(segmentationId);
              }}
              disabled={!allowExport}
            >
              {t('DICOM SEG')}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onSegmentationDelete(segmentationId)}>
        <Icons.Delete className="text-red-600" />
        <span className="pl-2 text-red-600">{t('Delete')}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
};
