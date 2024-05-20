import { useEffect, useRef } from 'react';
import {
  IAnnotationConfig,
  ITourEntityHotspot,
  SerNode,
  JourneyFlow,
  ITourDataOpts,
  JourneyData,
} from '@fable/common/dist/types';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { RespTour, Responsiveness,
  Plan as PaymentTermsPlan,
  Interval as PaymentTermsInterval,
} from '@fable/common/dist/api-contract';
import { TState } from './reducer';
import {
  AnnotationPerScreen,
  IAnnotationConfigWithScreen,
  JOURNEY_PROGRESS_LOCAL_STORE_KEY,
  FlowProgress,
  ExtMsg,
  Timeline,
  JourneyModuleWithAnns,
  queryData,
  AnnInverseLookupIndex,
  TourMainValidity,
  SiteData,
  SiteThemePresets,
  HiddenEls
} from './types';
import { getAnnotationBtn, getAnnotationByRefId } from './component/annotation/ops';
import { P_RespTour } from './entity-processor';
import { IAnnotationConfigWithLocation } from './container/analytics';
import { IAnnotationConfigWithScreenId } from './component/annotation/annotation-config-utils';
import { FABLE_LOCAL_STORAGE_ORG_ID_KEY } from './constants';
import { FeatureForPlan, PlanDetail, AnalyticsValue, AnnotationValue } from './plans';

export const LOCAL_STORE_TIMELINE_ORDER_KEY = 'fable/timeline_order_2';
const EXTENSION_ID = process.env.REACT_APP_EXTENSION_ID as string;
export const AEP_HEIGHT = 25;
export const ANN_EDIT_PANEL_WIDTH = 350;
export const RESP_MOBILE_SRN_WIDTH_LIMIT = 490;
export const RESP_MOBILE_SRN_WIDTH = 390;
export const RESP_MOBILE_SRN_HEIGHT = 844;

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

export const doesBtnOpenALink = (ann: IAnnotationConfig, type: 'next' | 'prev'): boolean => {
  const foundBtn = getAnnotationBtn(ann, type);
  return !!(foundBtn.hotspot && foundBtn.hotspot.actionType === 'open');
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

export const isValidUrl = (url: string) : boolean => {
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
  MOBILE_PORTRAIT,
  MOBILE_LANDSCAPE
}

export const getDimensionsBasedOnDisplaySize = (displaySize: DisplaySize): { height: string; width: string } => {
  switch (displaySize) {
    case DisplaySize.FIT_TO_SCREEN:
      return { height: '100%', width: '100%' };
    case DisplaySize.MEDIUM:
      return { height: '563px', width: '1000px' };
    case DisplaySize.SMALL:
      return { height: '450px', width: '800px' };
    case DisplaySize.MOBILE_PORTRAIT:
      return { height: `${RESP_MOBILE_SRN_HEIGHT}px`, width: `${RESP_MOBILE_SRN_WIDTH}px` };
    case DisplaySize.MOBILE_LANDSCAPE:
      return { width: `${RESP_MOBILE_SRN_HEIGHT}px`, height: `${RESP_MOBILE_SRN_WIDTH}px` };
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

export function postMessageForEvent<T>(eventType: ExtMsg, payload: T): void {
  const message = {
    sender: 'sharefable.com',
    type: eventType,
    payload,
  };

  window.parent.postMessage(message, '*');
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

const getOrderedAnnsFromGivenAnn = (
  ann: IAnnotationConfigWithLocation,
  flatAnns: Record<string, IAnnotationConfigWithLocation>
): IAnnotationConfigWithLocation[] => {
  const annsInOrder: IAnnotationConfigWithLocation[] = [];

  while (true) {
    annsInOrder.push(ann);

    const nextBtn = getAnnotationBtn(ann, 'next')!;
    if (!nextBtn.hotspot || nextBtn.hotspot.actionType === 'open') {
      break;
    }
    const nextAnnRefId = nextBtn.hotspot.actionValue.split('/')[1];
    ann = flatAnns[nextAnnRefId];
  }

  return annsInOrder;
};

const getFlatAnns = (
  allAnns: AnnotationPerScreen[],
  tour?: P_RespTour,
): Record<string, IAnnotationConfigWithLocation> => {
  const flatAnns: Record<string, IAnnotationConfigWithLocation> = {};
  for (const annPerScreen of allAnns) {
    for (const ann of annPerScreen.annotations) {
      flatAnns[ann.refId] = {
        ...ann,
        location: tour ? `/demo/${tour.rid}/${annPerScreen.screen.rid}/${ann.refId}` : '',
        screenId: annPerScreen.screen.id,
      };
    }
  }
  return flatAnns;
};

// Irrespective of journey's presence this function always returns standard a data format
// The first element always contains the full dataset across all journey. If journey is not present
// then there is only one element in the array
export function getJourneyWithAnnotationsNormalized(
  allAnns: AnnotationPerScreen[],
  journeyModules: JourneyFlow[],
  tour: P_RespTour,
  opts: ITourDataOpts
): JourneyModuleWithAnns[] {
  const annsOrderedByJourney = getJourneyWithAnnotations(allAnns, journeyModules, tour);
  if (!annsOrderedByJourney.length) {
    // journey not present
    const main = opts.main || '';
    const phoney: JourneyModuleWithAnns = {
      isPhony: true,
      header1: '',
      header2: '',
      main,
      annsInOrder: main ? getOrderedAnnotaionFromMain(allAnns, main) : [],
      mandatory: false
    };
    return [phoney];
  }
  const phony = {
    isPhony: true,
    header1: '',
    header2: '',
    main: '',
    mandatory: false,
    annsInOrder: annsOrderedByJourney.reduce((flatArr, journeysWithAnns) => {
      flatArr.push(...journeysWithAnns.annsInOrder);
      return flatArr;
    }, [] as IAnnotationConfigWithLocation[])
  };
  annsOrderedByJourney.unshift(phony);
  return annsOrderedByJourney;
}

export function annotationInverseLookupIndex(orderedAnnsWithJourney: JourneyModuleWithAnns[]): AnnInverseLookupIndex {
  const hm: AnnInverseLookupIndex = {};

  // the first element of the joureny is phoney it contains all the annotations irrespective of journey
  // is present or not.
  // hence we check if the journey is present (len > 1) we omit the first element as it contains information
  // that in turn is present in the subsequent journeys
  const unitJourneys = orderedAnnsWithJourney.length === 1 ? orderedAnnsWithJourney : orderedAnnsWithJourney.slice(1);

  let flowIndex = 0;
  for (const flow of unitJourneys) {
    let stepNo = 0;
    for (const ann of flow.annsInOrder) {
      hm[ann.refId] = {
        journeyName: flow.header1,
        flowIndex,
        flowLength: unitJourneys.length,
        isJourneyPhony: !!flow.isPhony,
        stepNo: ++stepNo,
        ann
      };
    }
    flowIndex++;
  }

  return hm;
}

export const getJourneyWithAnnotations = (
  allAnns: AnnotationPerScreen[],
  journeyModules: JourneyFlow[],
  tour?: P_RespTour,
) : JourneyModuleWithAnns[] => {
  if (!journeyModules.length) return [];

  const journeyData : JourneyModuleWithAnns[] = [];
  const flatAnns = getFlatAnns(allAnns, tour);

  const firstAnns: IAnnotationConfigWithLocation[] = [];
  journeyModules.forEach(module => {
    const firstAnnId = module.main.split('/')[1];
    firstAnns.push(flatAnns[firstAnnId]);
  });

  firstAnns.forEach((firstAnn, index) => {
    const annsInOrder = getOrderedAnnsFromGivenAnn(firstAnn, flatAnns);
    const flow: JourneyModuleWithAnns = {
      ...journeyModules[index],
      annsInOrder
    };

    journeyData.push(flow);
  });

  return journeyData;
};

export const getOrderedAnnotaionFromMain = (
  allAnns: AnnotationPerScreen[],
  main: string
) : IAnnotationConfigWithLocation[] => {
  const flatAnns = getFlatAnns(allAnns);
  const firstAnnId = main.split('/')[1];
  const firstAnn = flatAnns[firstAnnId];

  const annsInOrder = getOrderedAnnsFromGivenAnn(firstAnn, flatAnns);
  return annsInOrder;
};

export const updateAllAnnotationsForTour = (
  allAnnotationForTour: AnnotationPerScreen[],
): AnnotationPerScreen[] => {
  const newAllAnnotationForTour = [...allAnnotationForTour];
  newAllAnnotationForTour.forEach((screen) => {
    screen.annotations.forEach((annotation) => {
      if (annotation.type === 'default') {
        annotation.hideAnnotation = true;
        annotation.isHotspot = true;
      }
    });
  });

  return newAllAnnotationForTour;
};

export const updateAllAnnotations = (
  allAnnotations: Record<string, IAnnotationConfig[]>
): Record<string, IAnnotationConfig[]> => {
  Object.keys(allAnnotations).forEach(screen => {
    allAnnotations[screen].forEach((annotation) => {
      if (annotation.type === 'default') {
        annotation.hideAnnotation = true;
        annotation.isHotspot = true;
      }
    });
  });
  return allAnnotations;
};

export const getSearchParamData = (param: string | null) : queryData | null => {
  if (!param) {
    return null;
  }
  const decodedQuery = window.atob(decodeURIComponent(param));
  const query = JSON.parse(decodedQuery);
  return query;
};

type DebounceFunction<T extends any[]> = (...args: T) => void;

export function debounce<T extends any[]>(
  func: DebounceFunction<T>,
  delay: number
): DebounceFunction<T> {
  let timeout: NodeJS.Timeout | null;

  return function (...args: T) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    clearTimeout(timeout as NodeJS.Timeout);
    timeout = setTimeout(later, delay);
  };
}

export const isTourMainValid = (main: string | null | undefined, allAnns: AnnotationPerScreen[]): boolean => {
  if (main) {
    const [screenId, annId] = main.split('/');
    const annWithScreenId = getAnnotationByRefId(annId, allAnns);
    if (annWithScreenId && annWithScreenId.screenId === +screenId) {
      return true;
    }
  }
  return false;
};

export const getTourMainValidity = (
  tourOpts: ITourDataOpts | null,
  journey: JourneyData | null,
  allAnnotationsForTour: AnnotationPerScreen[],
): TourMainValidity => {
  let tourMainValidity: TourMainValidity = TourMainValidity.Valid;

  if (journey && journey.flows.length !== 0) {
    journey.flows.forEach(flow => {
      if (!isTourMainValid(flow.main, allAnnotationsForTour)) {
        tourMainValidity = TourMainValidity.Journey_Main_Not_Present;
      }
    });
  } else if (!tourOpts || !tourOpts.main) {
    tourMainValidity = TourMainValidity.Main_Not_Set;
  } else if (!isTourMainValid(tourOpts.main, allAnnotationsForTour)) {
    tourMainValidity = TourMainValidity.Main_Not_Present;
  }

  return tourMainValidity;
};

export function rearrangeArray<T>(arr: T[], sourceIdx: number, destinationIdx: number): T[] {
  const newArr = [...arr];
  const [removed] = newArr.splice(sourceIdx, 1);
  newArr.splice(destinationIdx, 0, removed);
  return newArr;
}

export function preloadImagesInTour(
  allAnnotationsForTour: AnnotationPerScreen[],
  journey: JourneyData | null,
  main: string
) :void {
  let annotationsInTour: IAnnotationConfigWithScreenId[] = [];
  if (journey && journey.flows.length !== 0) {
    journey.flows.forEach((flow) => {
      const annsForFlow = getOrderedAnnotaionFromMain(allAnnotationsForTour, flow.main);
      annotationsInTour = [...annotationsInTour, ...annsForFlow];
    });
  } else {
    annotationsInTour = getOrderedAnnotaionFromMain(allAnnotationsForTour, main);
  }

  annotationsInTour.forEach((ann) => {
    const domParser = new DOMParser();
    const dom = domParser.parseFromString(ann.bodyContent, 'text/html');
    const imgSrcs = Array.from(dom.querySelectorAll('img')).map(img => img.src);
    imgSrcs.forEach((img) => {
      const link = document.createElement('link');
      link.as = 'image';
      link.rel = 'preload';
      link.href = img;
      document.head.appendChild(link);
    });
  });
}

export function getDefaultSiteData(tour: RespTour): SiteData {
  return {
    logo: '../../favicon.png',
    navLink: 'https://www.sharefable.com',
    title: tour.displayName,
    ctaText: 'Book a demo',
    ctaLink: 'https://www.sharefable.com/get-a-demo',
    themePreset: 'white',
    bg1: SiteThemePresets.white.bg1,
    bg2: SiteThemePresets.white.bg2,
    headerBg: 'auto',
    v: 1,
  };
}

const displayBlockStr = ';display:block';
const visibilityVisibleStr = ';visibility:visible';

export const makeVisibleAllParentsInHierarchy = (element: HTMLElement): HiddenEls => {
  let parent: HTMLElement | null = element;
  const displayNoneEls: HTMLElement[] = [];
  const visibilityHiddenEls: HTMLElement[] = [];
  while (parent) {
    const computedStyle = getComputedStyle(parent);
    if (computedStyle.display === 'none') {
      addInlineStyle(parent, displayBlockStr);
      displayNoneEls.push(parent);
    }
    if (computedStyle.visibility === 'hidden') {
      addInlineStyle(parent, visibilityVisibleStr);
      visibilityHiddenEls.push(parent);
    }
    parent = parent.parentElement;
  }
  return { displayNoneEls, visibilityHiddenEls };
};

export const undoMakeVisibleAllParentsInHierarchy = (hiddenEls: HiddenEls): void => {
  hiddenEls.visibilityHiddenEls.forEach(el => removeInlineStyle(el, visibilityVisibleStr));
  hiddenEls.displayNoneEls.forEach(el => removeInlineStyle(el, displayBlockStr));
};

function removeLastNCharacters(str: string, n: number): string {
  return str.substring(0, str.length - n);
}

function addInlineStyle(el: HTMLElement, style: string): void {
  el.setAttribute('style', `${el.getAttribute('style')}${style}`);
}

function removeInlineStyle(el: HTMLElement, style: string): void {
  const styleAttrVal = el.getAttribute('style') || '';
  if (styleAttrVal.endsWith(style)) {
    el.setAttribute('style', removeLastNCharacters(styleAttrVal, style.length));
  }
}
export const isTourResponsive = (tour: P_RespTour): boolean => {
  const res = tour.responsive2 === Responsiveness.Responsive;
  return res;
};

export function getMobileOperatingSystem(): 'Windows Phone' | 'Android' | 'iOS' | 'unknown' {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Windows Phone must come first because its UA also contains "Android"
  if (/windows phone/i.test(userAgent)) {
    return 'Windows Phone';
  }

  if (/android/i.test(userAgent)) {
    return 'Android';
  }

  // iOS detection from: http://stackoverflow.com/a/9039885/177710
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'iOS';
  }

  return 'unknown';
}

export const isLandscapeMode = (screenOrientation: OrientationType): boolean => {
  const isLandscape = screenOrientation === 'landscape-primary' || screenOrientation === 'landscape-secondary';
  return isLandscape;
};

function checkFeatureAvailable(test: PlanDetail['test'], value: PlanDetail['value'], currentValue?: number): boolean {
  if (test === 'switch') {
    if (value === 'on') {
      return true;
    }
    return false;
  }
  if (test === 'text') {
    if (typeof value !== 'object' || value.length === 0) {
      return false;
    }

    if (AnalyticsValue.includes(value[0])) {
      if (value.includes('advanced')) {
        return true;
      }
      return false;
    }

    if (AnnotationValue.includes(value[0])) {
      if (value.includes('video')) {
        return true;
      }
      return false;
    }
  }
  if (test === 'count' && currentValue) {
    const operator = value.slice(0, 2) as string;
    const number = value.slice(2) as string;
    const numInInt = parseInt(number, 10);
    if (operator === '<=') {
      return currentValue <= numInInt;
    } if (operator === '>=') {
      return currentValue >= numInInt;
    }
  }
  return true;
}

export const isFeatureAvailable = (
  featureForPlan: FeatureForPlan | null,
  feature: string,
  currentValue?: number
): boolean => {
  if (!featureForPlan) {
    return true;
  }
  const featureDetail = featureForPlan[feature];

  if (!featureDetail) {
    const err : Error = {
      name: 'feature gate failed',
      message: `plan ${feature} not available`
    };
    raiseDeferredError(err);
    return true;
  }
  return checkFeatureAvailable(featureDetail.test, featureDetail.value, currentValue);
};

export const mapPlanIdAndIntervals = (
  chosenPlan: 'solo' | 'startup' | 'business' | 'lifetime',
  chosenInterval: 'annual' | 'monthly' | 'lifetime',
): {
  plan: PaymentTermsPlan | null,
  interval: PaymentTermsInterval | null,
} => {
  let plan: PaymentTermsPlan | null = null;
  switch (chosenPlan.toUpperCase()) {
    case 'SOLO':
      plan = PaymentTermsPlan.SOLO;
      break;
    case 'STARTUP':
      plan = PaymentTermsPlan.STARTUP;
      break;

    case 'BUSINESS':
      plan = PaymentTermsPlan.BUSINESS;
      break;

    case 'LIFETIME':
      // just a placeholder for api compatibility. license is used to determine the plan (or tier)
      plan = PaymentTermsPlan.LIFETIME_TIER1;
      break;

    default:
      plan = null;
      break;
  }

  let interval: PaymentTermsInterval | null = null;
  switch (chosenInterval.toUpperCase()) {
    case 'ANNUAL':
      interval = PaymentTermsInterval.YEARLY;
      break;

    case 'MONTHLY':
      interval = PaymentTermsInterval.MONTHLY;
      break;

    case 'LIFETIME':
      interval = PaymentTermsInterval.LIFETIME;
      break;

    default:
      interval = null;
      break;
  }

  return {
    plan,
    interval,
  };
};
