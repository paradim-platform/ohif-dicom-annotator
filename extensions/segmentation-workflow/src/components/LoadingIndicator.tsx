import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { eventTarget, Enums } from '@cornerstonejs/core';
import { useSystem } from '@ohif/core/src';

import { ProgressLoadingBar, Icons } from '@ohif/ui-next';

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function getActiveViewportImageIds(servicesManager: AppTypes.ServicesManager): Set<string> {
  const { viewportGridService, displaySetService } = servicesManager.services;
  const activeViewportId = viewportGridService.getState().activeViewportId;

  const imageIds = new Set<string>();

  if (!activeViewportId) {
    return imageIds;
  }

  const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(activeViewportId) ?? [];

  displaySetUIDs.forEach((displaySetUID: string) => {
    const displaySet = displaySetService.getDisplaySetByUID(displaySetUID);
    (displaySet?.imageIds ?? []).forEach((imageId: string) => imageIds.add(imageId));
  });

  return imageIds;
}

function getActiveViewportRect(servicesManager: AppTypes.ServicesManager): Rect | null {
  const { viewportGridService, cornerstoneViewportService } = servicesManager.services;
  const activeViewportId = viewportGridService.getState().activeViewportId;

  if (!activeViewportId) {
    return null;
  }

  const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);
  const element = viewport?.element as HTMLDivElement | undefined;

  if (!element) {
    return null;
  }

  const { top, left, width, height } = element.getBoundingClientRect();
  return { top, left, width, height };
}

function LoadingIndicator() {
  const { servicesManager } = useSystem();

  const [rect, setRect] = useState<Rect | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);

  const imageIdsRef = useRef<Set<string>>(new Set());
  const countedRef = useRef<Set<string>>(new Set());

  const initialize = useCallback(() => {
    const imageIds = getActiveViewportImageIds(servicesManager);
    imageIdsRef.current = imageIds;
    countedRef.current = new Set();

    setTotalFrames(imageIds.size);
    setLoadedCount(0);
    setRect(getActiveViewportRect(servicesManager));
  }, [servicesManager]);

  useEffect(() => {
    const { viewportGridService } = servicesManager.services;

    initialize();

    const subscriptions = [
      viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED,
      viewportGridService.EVENTS.VIEWPORTS_READY,
      viewportGridService.EVENTS.GRID_STATE_CHANGED,
    ].map(event => viewportGridService.subscribe(event, initialize));

    return () => {
      subscriptions.forEach(({ unsubscribe }) => unsubscribe());
    };
  }, [servicesManager, initialize]);

  useEffect(() => {
    const handleImageLoaded = (evt: { detail: { imageId: string } }) => {
      const { imageId } = evt.detail;

      if (!imageIdsRef.current.has(imageId) || countedRef.current.has(imageId)) {
        return;
      }

      countedRef.current.add(imageId);
      setLoadedCount(countedRef.current.size);
    };

    eventTarget.addEventListener(Enums.Events.IMAGE_LOADED, handleImageLoaded);

    return () => {
      eventTarget.removeEventListener(Enums.Events.IMAGE_LOADED, handleImageLoaded);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setRect(getActiveViewportRect(servicesManager));

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [servicesManager]);

  if (!rect || totalFrames === 0) {
    return null;
  }

  if (loadedCount >= totalFrames) {
    return null;
  }

  const percent = Math.min(100, Math.round((loadedCount / totalFrames) * 100));

  const overlay = (
    <div
      style={{
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        zIndex: 50,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}
    >
      <Icons.LoadingOHIFMark className="h-12 w-12 text-white" />
      <div style={{ width: '12rem' }}>
        <ProgressLoadingBar progress={percent} />
      </div>
      <span className="text-sm text-white">
        Loading {loadedCount} / {totalFrames} frames
      </span>
    </div>
  );

  return ReactDOM.createPortal(overlay, document.body);
}

export default LoadingIndicator;
