import { useEffect, useRef } from 'react';
import { IAnnotationConfig, ITourEntityHotspot } from '@fable/common/dist/types';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { TState } from './reducer';
import { AnnotationPerScreen, ConnectedOrderedAnnGroupedByScreen, IAnnotationConfigWithScreen } from './types';

export const LOCAL_STORE_TIMELINE_ORDER_KEY = 'fable/timeline_order_2';
const EXTENSION_ID = process.env.REACT_APP_EXTENSION_ID as string;
export const AEP_HEIGHT = 25;
export const ANN_EDIT_PANEL_WIDTH = 350;

export function isBodyEl(el: HTMLElement): boolean {
  return !!(el && el.tagName && el.tagName.toLowerCase() === 'body');
}

export const usePrevious = <T extends unknown>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export function openTourExternalLink(uri: string): void {
  const qParamsStr = window.location.search;
  const qParams = new URLSearchParams(qParamsStr);
  qParams.forEach((val, key) => {
    const pattern = `{{${key}}}`;
    uri = uri.replaceAll(pattern, val);
  });

  const url = new URL(uri);
  const sharefableUrl = new URL(process.env.REACT_APP_CLIENT_ENDPOINT as string);
  if (url.host === sharefableUrl.host) {
    window.open(uri, '_self');
  } else {
    window.open(uri, '_blank')?.focus();
  }
}

export function getAnnotationsPerScreen(state: TState): AnnotationPerScreen[] {
  const anPerScreen: AnnotationPerScreen[] = [];
  try {
    const combinedAnnotations: Record<string, IAnnotationConfig> = {};
    const annToDeleteAcrossScreen: Record<string, Record<string, number>> = {};
    for (const [screenId, anns] of Object.entries(state.default.localAnnotations)) {
      const idMap = state.default.localAnnotationsIdMap[screenId];
      const deleteMap: Record<string, number> = annToDeleteAcrossScreen[screenId] = {};
      for (let i = 0; i < anns.length; i++) {
        if (!anns[i]) {
          deleteMap[idMap[i]] = 1;
          continue;
        }
        combinedAnnotations[`${screenId}/${anns[i].refId}`] = anns[i];
      }
    }
    for (const [screenId, anns] of Object.entries(state.default.remoteAnnotations)) {
      for (const an of anns) {
        const key = `${screenId}/${an.refId}`;
        if (an.id in (annToDeleteAcrossScreen[screenId] || {})) continue;
        if (!(key in combinedAnnotations)) combinedAnnotations[key] = an;
      }
    }
    const screenAnMap: Record<string, IAnnotationConfig[]> = {};
    for (const [qId, an] of Object.entries(combinedAnnotations)) {
      const [screenId] = qId.split('/');
      if (screenId in screenAnMap) {
        screenAnMap[screenId].push(an);
      } else {
        screenAnMap[screenId] = [an];
        const screen = state.default.allScreens.find(s => s.id === +screenId);
        if (screen) {
          anPerScreen.push({ screen, annotations: screenAnMap[screenId] });
        } else {
          raiseDeferredError(new Error(`screenId ${screenId} 
          is part of tour config, but is not present as part of entity association`));
        }
      }
    }
    // If there are screen present as part of a tour but no annotation is yet made then also we
    // show this
    const screensForTours = state.default.currentTour?.screens || [];
    for (const screen of screensForTours) {
      if (!(screen.id in screenAnMap)) {
        anPerScreen.push({ screen, annotations: [] });
      }
    }
  } catch (e) {
    raiseDeferredError(e as Error);
  }
  return anPerScreen;
}

export function isBlankString(str: string): boolean {
  return str.trim() === '';
}
export const isVideoAnnotation = (config: IAnnotationConfig): boolean => !isBlankString(config.videoUrl)
  || (!isBlankString(config.videoUrlMp4)
    || !isBlankString(config.videoUrlWebm)
    || !isBlankString(config.videoUrlHls));

export function flatten<T>(arr: Array<T[]>): T[] {
  const flatArr: T[] = [];
  for (const item of arr) {
    flatArr.push(...item);
  }
  return flatArr;
}

export const generateTimelineOrder = (timeline: ConnectedOrderedAnnGroupedByScreen): string[] => {
  const newTimelineOrder: string[] = [];
  for (const group of timeline) {
    newTimelineOrder.push(group[0][0].grpId);
  }

  return newTimelineOrder;
};

export const getFableTimelineOrder = (): LocalStoreTimelineOrder => {
  const FABLE_TIMELINE_ORDER = localStorage.getItem(LOCAL_STORE_TIMELINE_ORDER_KEY);
  return FABLE_TIMELINE_ORDER
    ? JSON.parse(FABLE_TIMELINE_ORDER) as LocalStoreTimelineOrder
    : { rid: '', order: [] };
};

export const saveFableTimelineOrder = (timelineOrder: LocalStoreTimelineOrder): void => {
  localStorage.setItem(LOCAL_STORE_TIMELINE_ORDER_KEY, JSON.stringify(timelineOrder));
};

interface LocalStoreTimelineOrder {
  rid: string;
  order: string[];
}

export const updateLocalTimelineGroupProp = (grpId: string, nearbygrpId: string): void => {
  const FABLE_TIMELINE_ORDER = getFableTimelineOrder();
  FABLE_TIMELINE_ORDER.order.splice(FABLE_TIMELINE_ORDER.order.indexOf(nearbygrpId) + 1, 0, grpId);
  saveFableTimelineOrder(FABLE_TIMELINE_ORDER);
};

export const isNavigateHotspot = (hotspot: ITourEntityHotspot | null): boolean => {
  const result = Boolean((hotspot && hotspot.actionType === 'navigate'));
  return result;
};

export const isNextBtnOpensALink = (ann: IAnnotationConfig): boolean => {
  const nxt = ann.buttons.find(btn => btn.type === 'next')!;
  return !!(nxt.hotspot && nxt.hotspot.actionType === 'open');
};

export const DEFAULT_ALERT_FOR_ANN_OPS = 'Operation can\'t be performed.';

export function getColorContrast(hex: string): 'dark' | 'light' {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 154) ? 'light' : 'dark';
}

export const setEventCommonState = (property: string, value: any): void => {
  const ep = localStorage.getItem('fable/ep');
  const eventProperties = ep ? JSON.parse(ep) : {};
  eventProperties[property] = value;

  localStorage.setItem('fable/ep', JSON.stringify(eventProperties));
};

const baseURL = process.env.REACT_APP_CLIENT_ENDPOINT as string;

export const generateScreenIndex = (timelineCount: number, timelineIdx: number, annIdx: number): string => {
  if (timelineCount > 1) {
    const screenIdx = `Step ${String.fromCharCode(65 + timelineIdx)}-${annIdx}`;
    return screenIdx;
  }

  return `Step ${annIdx.toString()}`;
};

export const assignScreenIndices = (
  orderedAnns: ConnectedOrderedAnnGroupedByScreen
): ConnectedOrderedAnnGroupedByScreen => {
  for (let i = 0; i < orderedAnns.length; i++) {
    let annIdx = 0;
    for (const screenGroup of orderedAnns[i]) {
      for (const annotation of screenGroup) {
        annIdx++;
        annotation.index = generateScreenIndex(orderedAnns.length, i, annIdx);
      }
    }
  }

  return orderedAnns;
};

export const createIframeSrc = (relativeURL: string): string => baseURL + relativeURL;

export const isExtensionInstalled = (): Promise<boolean> => new Promise((resolve) => {
  if (typeof chrome === 'undefined' || !chrome.runtime) resolve(false);

  chrome.runtime.sendMessage(
    EXTENSION_ID,
    { message: 'version' },
    (response) => {
      if (response && response.version) resolve(true);
      if (chrome.runtime.lastError) resolve(false);
    }
  );
});

export const getAnnotationWithScreenAndIdx = (
  annRefId: string,
  entireTimeline: ConnectedOrderedAnnGroupedByScreen
): IAnnotationConfigWithScreen | null => {
  let ann: IAnnotationConfigWithScreen | null = null;
  entireTimeline.forEach(connectedTimeline => {
    connectedTimeline.forEach(timeline => {
      timeline.forEach(config => {
        if (config.refId === annRefId) ann = config;
      });
    });
  });
  return ann;
};
