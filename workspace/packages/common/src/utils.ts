import {
  AnnotationBodyTextSize,
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationPositions,
  IAnnotationConfig,
  ITourDataOpts,
  TourData
} from './types';
import { SchemaVersion } from './api-contract';

export function isSameOrigin(origin1: string, origin2: string): boolean {
  const url1 = new URL(origin1);
  const url2 = new URL(origin2);

  return url1.host === url2.host;
}

export const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getDisplayableTime(d: Date): string {
  const now = +new Date();
  const dMs = +d;
  const diff = now - dMs;

  const aMin = 60 * 1000;
  const anHour = 60 * aMin;
  const aDay = 24 * anHour;

  if (diff < aMin) {
    return 'Just now';
  }

  if (diff < anHour) {
    const mins = (diff / aMin) | 0;
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  }

  if (diff < aDay) {
    const hrs = (diff / anHour) | 0;
    return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  }

  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

// eslint-disable-next-line no-promise-executor-return
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function getCurrentUtcUnixTime(): number {
  return Math.floor(new Date().getTime() / 1000);
}

export function deepcopy<T>(obj: T): T {
  if ('structuredClone' in window && typeof structuredClone === 'function') {
    return structuredClone(obj) as T;
  }
  return JSON.parse(JSON.stringify(obj));
}

export function trimSpaceAndNewLine(txt: string): string {
  return txt
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => t !== '')
    .join('\n');
}

export function getRandomId(): string {
  return `${+new Date() / 1000 | 0}${Math.random().toString(16).substring(2, 15)}`;
}

export function snowflake(): number {
  return parseInt(`${+new Date()}${(Math.random() * 1000) | 0}`, 10);
}

export const getDefaultTourOpts = (): ITourDataOpts => ({
  main: '',
  primaryColor: '#7567FF',
  annotationBodyBackgroundColor: '#FFFFFF',
  annotationBodyBorderColor: '#BDBDBD',
  monoIncKey: 0,
  createdAt: getCurrentUtcUnixTime(),
  updatedAt: getCurrentUtcUnixTime(),
});

export function createEmptyTourDataFile(): TourData {
  return {
    v: SchemaVersion.V1,
    lastUpdatedAtUtc: -1,
    opts: getDefaultTourOpts(),
    entities: {},
  };
}

export const getSampleConfig = (elPath: string): IAnnotationConfig => {
  const isCoverAnn = elPath === '$';
  const id = getRandomId();

  return {
    id: isCoverAnn ? `$#${id}` : elPath,
    refId: id,
    createdAt: getCurrentUtcUnixTime(),
    updatedAt: getCurrentUtcUnixTime(),
    bodyContent: 'Write a description about what this feature of your product does to your user.',
    displayText: 'Write a description about what this feature of your product does to your user.',
    positioning: AnnotationPositions.Auto,
    monoIncKey: 0,
    syncPending: true,
    type: isCoverAnn ? 'cover' : 'default',
    size: isCoverAnn ? 'medium' : 'small',
    isHotspot: false,
    hideAnnotation: false,
    bodyTextSize: AnnotationBodyTextSize.medium,
    videoUrl: '',
    videoUrlMp4: '',
    videoUrlWebm: '',
    showOverlay: true,
    // TODO : refactor it in such a way that only this 'hotspotElPath' property is enough
    // to convey if the ann has an hotspot. For eg. this will be null when hotspot toggle is off
    // it will be "." when hotspot toggle is on and will have a path like "1.1.2.2" when it is a granular hotspot
    hotspotElPath: null,
    buttons: [{
      id: getRandomId(),
      type: 'next',
      style: AnnotationButtonStyle.Primary,
      size: AnnotationButtonSize.Medium,
      text: 'Next',
      order: 9999,
      hotspot: null,
    }, {
      id: getRandomId(),
      type: 'prev',
      style: AnnotationButtonStyle.Outline,
      size: AnnotationButtonSize.Medium,
      text: 'Back',
      order: 0,
      hotspot: null
    }],
  };
};

const ROOT_EMBED_IFRAME_ID = `fab-reifi-${Math.random() * (10 ** 4) | 0}`;
export const calculatePathFromEl = (el: Node, loc: number[]): number[] => {
  if (el.nodeName === '#document') {
    const tEl = el as Document;
    if (tEl.defaultView && tEl.defaultView.frameElement && tEl.defaultView.frameElement.id !== ROOT_EMBED_IFRAME_ID) {
      return calculatePathFromEl(tEl.defaultView.frameElement, loc);
    }
    return loc.reverse();
  }
  const siblings = el.parentNode!.childNodes;
  for (let i = 0, l = siblings.length; i < l; i++) {
    if (el === siblings[i]) {
      loc.push(i);
      return calculatePathFromEl(el.parentNode!, loc);
    }
  }
  return loc;
};

export const isProdEnv = () => {
  const isProd = (process.env.REACT_APP_ENVIRONMENT === 'prod') || (process.env.REACT_APP_ENVIRONMENT === 'stage');
  return isProd;
};
