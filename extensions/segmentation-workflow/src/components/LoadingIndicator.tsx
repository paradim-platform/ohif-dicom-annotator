import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { DicomMetadataStore } from '@ohif/core/src/services/DicomMetadataStore';

import { ProgressLoadingBar } from '@ohif/ui-next';
import { Icons } from '@ohif/ui-next';

function LoadingIndicator() {
  const [progressDone, setProgressDone] = useState(false);

  useEffect(() => {
    const { unsubscribe: seriesAddedUnsubscribe } = DicomMetadataStore.subscribe(
      DicomMetadataStore.EVENTS.SERIES_ADDED,
      () => {
        setProgressDone(true);
      }
    );

    return () => {
      seriesAddedUnsubscribe();
    };
  }, []);

  if (progressDone) {
    return null;
  }

  return (
    <div className={classNames('flex flex-col items-center justify-center space-y-5')}>
      <Icons.LoadingOHIFMark className="h-12 w-12 text-white" />
      <div className="w-48">
        <ProgressLoadingBar />
      </div>
      Loading frames ...
    </div>
  );
}

export default LoadingIndicator;
