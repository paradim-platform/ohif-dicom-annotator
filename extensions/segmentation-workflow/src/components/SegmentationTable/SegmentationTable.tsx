import React, { Children, isValidElement, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons, PanelSection } from '@ohif/ui-next';
import {
  SegmentationTableContextType,
  SegmentationTableProvider,
} from '@ohif/ui-next/components/SegmentationTable/contexts/SegmentationTableContext';
import { SegmentationSegments } from './SegmentationSegments';
import { SegmentStatistics } from '@ohif/ui-next/components/SegmentationTable/SegmentStatistics';
import { SegmentationTableConfig } from '@ohif/ui-next/components/SegmentationTable/SegmentationTableConfig';
import { AddSegmentRow } from '@ohif/ui-next/components/SegmentationTable/AddSegmentRow';
import { AddSegmentationRow } from '@ohif/ui-next/components/SegmentationTable/AddSegmentationRow';
import { SegmentationHeader } from '@ohif/ui-next/components/SegmentationTable/SegmentationHeader';
import { SegmentationCollapsed } from '@ohif/ui-next/components/SegmentationTable/SegmentationCollapsed';
import { SegmentationExpanded } from '@ohif/ui-next/components/SegmentationTable/SegmentationExpanded';

interface SegmentationTableProps extends Omit<SegmentationTableContextType, 'setShowConfig'> {
  title?: string;
  children?: ReactNode;
  setShowConfig?: (value: boolean) => void;
}

interface SegmentationTableComponent extends React.FC<SegmentationTableProps> {
  Segments: typeof SegmentationSegments;
  Config: typeof SegmentationTableConfig;
  AddSegmentRow: typeof AddSegmentRow;
  AddSegmentationRow: typeof AddSegmentationRow;
  Header: typeof SegmentationHeader;
  Collapsed: typeof SegmentationCollapsed;
  Expanded: typeof SegmentationExpanded;
  SegmentStatistics: typeof SegmentStatistics;
}

export const SegmentationTableRoot = (props: SegmentationTableProps) => {
  const { t } = useTranslation('SegmentationTable');
  const {
    data = [],
    mode,
    title,
    disableEditing = false,
    disabled = false,
    children,
    showConfig: externalShowConfig,
    ...contextProps
  } = props;

  const [internalShowConfig, setInternalShowConfig] = useState(false);
  const showConfig = externalShowConfig !== undefined ? externalShowConfig : internalShowConfig;

  // Find the active segmentation info based on which representation is active
  const activeSegmentationInfo = data.find(info => info.representation?.active);

  // Get the active segmentation ID
  const activeSegmentationId =
    props.activeSegmentationId || activeSegmentationInfo?.segmentation?.segmentationId;
  const activeRepresentation = props.activeRepresentation || activeSegmentationInfo?.representation;
  const activeSegmentation = props.activeSegmentation || activeSegmentationInfo?.segmentation;

  // Extract style properties or use defaults
  const {
    fillAlpha = props.fillAlpha || 0.5,
    fillAlphaInactive = props.fillAlphaInactive || 0.2,
    outlineWidth = props.outlineWidth || 1,
    renderFill = props.renderFill !== undefined ? props.renderFill : true,
    renderOutline = props.renderOutline !== undefined ? props.renderOutline : true,
  } = activeRepresentation?.styles ?? {};

  // Check if SegmentationTableConfig is present in children
  const hasConfigComponent = Children.toArray(children).some(
    child => isValidElement(child) && child.type === SegmentationTableConfig
  );

  // Process children to conditionally render the config component based on showConfig
  const processedChildren = Children.map(children, child => {
    if (isValidElement(child) && child.type === SegmentationTableConfig) {
      // Only render the Config component if showConfig is true
      return showConfig ? child : null;
    }
    return child;
  });

  const toggleShowConfig = () => {
    if (props.setShowConfig) {
      props.setShowConfig(!showConfig);
    } else {
      setInternalShowConfig(!internalShowConfig);
    }
  };

  return (
    <SegmentationTableProvider
      value={{
        data,
        mode,
        showConfig,
        disabled,
        disableEditing,
        fillAlpha,
        fillAlphaInactive,
        outlineWidth,
        renderFill,
        renderOutline,
        activeSegmentationId,
        activeSegmentation,
        activeRepresentation,
        ...contextProps,
        setShowConfig: toggleShowConfig,
      }}
    >
      <PanelSection defaultOpen={true}>
        <PanelSection.Header className="flex items-center justify-between">
          <span>{t(title)}</span>
          {hasConfigComponent && (
            <div className="ml-auto mr-2">
              <Icons.Settings
                className="text-primary h-4 w-4"
                onClick={e => {
                  e.stopPropagation();
                  toggleShowConfig();
                }}
              />
            </div>
          )}
        </PanelSection.Header>
        <PanelSection.Content>{processedChildren}</PanelSection.Content>
      </PanelSection>
    </SegmentationTableProvider>
  );
};

const SegmentationTable = Object.assign(SegmentationTableRoot, {
  Segments: SegmentationSegments,
  Config: SegmentationTableConfig,
  AddSegmentRow: AddSegmentRow,
  AddSegmentationRow: AddSegmentationRow,
  Collapsed: SegmentationCollapsed,
  Expanded: SegmentationExpanded,
  SegmentStatistics: SegmentStatistics,
  Header: SegmentationHeader,
}) as SegmentationTableComponent;

export { SegmentationTable };
