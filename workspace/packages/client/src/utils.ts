import { useEffect, useRef } from 'react';
import { IAnnotationConfig, ITourEntityHotspot, SerNode, JourneyFlow } from '@fable/common/dist/types';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { TState } from './reducer';
import {
  AnnotationPerScreen,
  IAnnotationConfigWithScreen,
  JOURNEY_PROGRESS_LOCAL_STORE_KEY,
  FlowProgress,
  InternalEvents,
  GlobalAppData,
  GlobalWin,
  ExtMsg,
  Timeline
} from './types';
import { getAnnotationBtn, getAnnotationByRefId } from './component/annotation/ops';

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

export const isCoverAnnotation = (config: IAnnotationConfig): boolean => config.type === 'cover';

export function flatten<T>(arr: Array<T[]>): T[] {
  const flatArr: T[] = [];
  for (const item of arr) {
    flatArr.push(...item);
  }
  return flatArr;
}

export const generateTimelineOrder = (timeline: Timeline): string[] => {
  const newTimelineOrder: string[] = [];
  for (const group of timeline) {
    newTimelineOrder.push(group[0].grpId);
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

export const baseURL = process.env.REACT_APP_CLIENT_ENDPOINT as string;

export const generateScreenIndex = (timelineCount: number, timelineIdx: number, annIdx: number): string => {
  if (timelineCount > 1) {
    const screenIdx = `${String.fromCharCode(65 + timelineIdx)}-${annIdx}`;
    return screenIdx;
  }

  return `${annIdx.toString()}`;
};

export const assignStepNumbersToAnnotations = (
  timeline: Timeline
): Timeline => {
  timeline.forEach((singleTimeline, singleTimelineIdx) => {
    singleTimeline.forEach((ann, annIdx) => {
      ann.stepNumber = generateScreenIndex(timeline.length, singleTimelineIdx, annIdx + 1);
    });
  });
  return timeline;
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
  entireTimeline: Timeline
): IAnnotationConfigWithScreen | null => {
  let ann: IAnnotationConfigWithScreen | null = null;
  entireTimeline.forEach(timeline => {
    timeline.forEach(config => {
      if (config.refId === annRefId) ann = config;
    });
  });
  return ann;
};

export const getJourneyProgress = (): Record<string, FlowProgress[]> => {
  const FABLE_JOURNEY_PROGRESS = sessionStorage.getItem(JOURNEY_PROGRESS_LOCAL_STORE_KEY);
  return FABLE_JOURNEY_PROGRESS ? JSON.parse(FABLE_JOURNEY_PROGRESS) as Record<string, FlowProgress[]> : {};
};

export const saveJourneyProgress = (journeyProgress: Record<string, FlowProgress[]>): void => {
  sessionStorage.setItem(JOURNEY_PROGRESS_LOCAL_STORE_KEY, JSON.stringify(journeyProgress));
};

const isValidUrl = (url: string) : boolean => {
  try {
    const constructedUrl = new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

export const getValidUrl = (url: string): string => {
  const isUrlValid = isValidUrl(url);
  if (!isUrlValid) {
    let inputUrl = url;
    if (!(inputUrl.startsWith('http://') || inputUrl.startsWith('https://'))) {
      inputUrl = `https://${inputUrl}`;
    }
    return isValidUrl(inputUrl) ? inputUrl : '';
  }

  return url;
};

export const enum DisplaySize {
  FIT_TO_SCREEN = 0,
  MEDIUM,
  SMALL,
}

export const getDimensionsBasedOnDisplaySize = (displaySize: DisplaySize): { height: string; width: string } => {
  switch (displaySize) {
    case DisplaySize.FIT_TO_SCREEN:
      return { height: '100%', width: '100%' };
    case DisplaySize.MEDIUM:
      return { height: '563px', width: '1000px' };
    case DisplaySize.SMALL:
      return { height: '450px', width: '800px' };
    default:
      return { height: '100%', width: '100%' };
  }
};

export function isDeepEqual<T>(obj1: T, obj2: T): boolean {
  const stack1: T[] = [obj1];
  const stack2: T[] = [obj2];

  while (stack1.length > 0 && stack2.length > 0) {
    const currentObj1 = stack1.pop();
    const currentObj2 = stack2.pop();

    if (typeof currentObj1 !== typeof currentObj2) {
      return false;
    }

    if (typeof currentObj1 === 'object'
    && currentObj1 !== null
    && typeof currentObj2 === 'object'
    && currentObj2 !== null
    ) {
      const keys1 = Object.keys(currentObj1);
      const keys2 = Object.keys(currentObj2);

      if (keys1.length !== keys2.length) {
        return false;
      }

      keys1.forEach(key => {
        stack1.push((currentObj1 as any)[key]);
      });

      keys2.forEach(key => {
        stack2.push((currentObj2 as any)[key]);
      });
    } else if (currentObj1 !== currentObj2) {
      return false;
    }
  }

  return stack1.length === 0 && stack2.length === 0;
}

export function removeDuplicatesOfStrArr(arr: string[]): string[] {
  const obj: Record<string, boolean> = {};

  for (const el of arr) {
    obj[el] = true;
  }

  return Object.keys(obj);
}

export function getFidOfSerNode(node: SerNode): string {
  if (!node) return '-1';
  let fid: string;
  if (node.type === 8 && node.name === '#comment') {
    const sub = node.props.textContent!.split('==')[0];
    fid = sub.split('/')[1];
  } else {
    fid = node.attrs['f-id']!;
  }
  return fid;
}

export function getFidOfNode(node: Node): string {
  if (!node) return '-1';
  let fid: string = '-1';
  if (node.nodeType === Node.COMMENT_NODE) {
    const sub = node.textContent!.split('==')[0];
    fid = sub.split('/')[1];
  } else if (node.nodeType === Node.TEXT_NODE) {
    node = node.previousSibling as Node;
    if (!node) return fid;
    const sub = node.textContent!.split('==')[0];
    fid = sub.split('/')[1];
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    fid = (node as HTMLElement).getAttribute('f-id')!;
  }
  return fid;
}

export const getChildElementByFid = (node: Node, fid: string): HTMLElement | null => {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i] as HTMLElement;
    switch (child.nodeType) {
      case Node.TEXT_NODE:
      case Node.COMMENT_NODE: {
        const sub = child.textContent?.split('==')[0] || '';
        const currFid = sub.split('/')[1];
        if (currFid === fid) { return child as HTMLElement; }
        break;
      }
      case Node.ELEMENT_NODE: {
        const currFid = child.getAttribute('f-id') || '';
        if (currFid === fid) return child as HTMLElement;
        break;
      }
      default:
        break;
    }
  }

  return null;
};

export const getAnnotationIndex = (annotationString: string, type: 'prev'|'next'|'custom'): number[] => {
  const fallbackAnnIndexArr = [-1, -1];
  if (!annotationString) {
    return fallbackAnnIndexArr;
  }
  const numberRegex = /\d+/g;
  const matchResult = annotationString.match(numberRegex);
  if (matchResult && matchResult.length !== 2) {
    return fallbackAnnIndexArr;
  }
  const result = matchResult ? matchResult.map(Number) : fallbackAnnIndexArr;
  const currentIndex = result[0];
  const totalIndex = result[1];
  if (type === 'prev' && currentIndex > 1) {
    return [currentIndex - 1, totalIndex];
  }
  if (type === 'next' && currentIndex < totalIndex) {
    return [currentIndex + 1, totalIndex];
  }
  return result;
};

export function postMessageForEvent<T>(eventType: ExtMsg, payload: T): void {
  const message = {
    sender: 'sharefable.com',
    type: eventType,
    payload,
  };

  window.parent.postMessage(message, '*');
}

export function addToGlobalAppData<T>(key: keyof GlobalAppData, val: GlobalAppData[keyof GlobalAppData]) : void {
  (window as GlobalWin).__fable_global_app_data__ = {
    ...((window as GlobalWin).__fable_global_app_data__ || {}),
    [key]: val
  };
}

export function getGlobalData(key: keyof GlobalAppData): GlobalAppData[keyof GlobalAppData] {
  const commonMessageData = (window as GlobalWin).__fable_global_app_data__ || {};
  return commonMessageData[key];
}
export const getCurrentFlowMain = (
  id: string,
  allAnnotationsForTour: AnnotationPerScreen[],
  flows: JourneyFlow[]
) : string => {
  let refId = id;
  while (refId) {
    const annotation = getAnnotationByRefId(refId, allAnnotationsForTour);
    const prevBtn = getAnnotationBtn(annotation!, 'prev');

    if (!prevBtn.hotspot) {
      const main = `${annotation!.screenId}/${refId}`;
      const flowIndex = flows.findIndex((flow) => flow.main === main);
      if (flowIndex !== -1) {
        return main;
      }
      break;
    }
    if (!isNavigateHotspot(prevBtn.hotspot)) break;
    refId = prevBtn.hotspot!.actionValue.split('/')[1];
  }
  return '';
};

export const isHTTPS = (url: string): boolean => url.trim().startsWith('https://');

export function isStrBlank(str: string | undefined | null): boolean {
  return !(str || '').trim();
}

export function getTransparencyFromHexStr(hex: string): number {
  if (hex.length <= 7) return 100;
  const transparencyHexStr = hex.substring(8);
  const h = parseInt(transparencyHexStr, 16);
  return Number.isNaN(h) ? 0 : Math.round((h / 255) * 100);
}
