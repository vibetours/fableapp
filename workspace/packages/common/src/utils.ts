import {
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationPositions,
  CreateJourneyPositioning,
  CustomAnnDims,
  IAnnotationConfig,
  ITourDataOpts,
  TourData
} from './types';
import { SchemaVersion } from './api-contract';
import { DEFAULT_BLUE_BORDER_COLOR } from './constants';

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
  annotationFontColor: '#424242',
  monoIncKey: 0,
  createdAt: getCurrentUtcUnixTime(),
  updatedAt: getCurrentUtcUnixTime(),
  annotationFontFamily: null,
  borderRadius: 4,
  annotationPadding: '14 14',
  showFableWatermark: true,
  showStepNum: true,
});

export function getSampleJourneyData() {
  return {
    positioning: CreateJourneyPositioning.Left_Bottom,
    title: '',
    flows: [],
    primaryColor: '#7567FF',
    hideModuleOnLoad: false,
    hideModuleOnMobile: false,
  };
}

export function createEmptyTourDataFile(): TourData {
  return {
    v: SchemaVersion.V1,
    lastUpdatedAtUtc: -1,
    opts: getDefaultTourOpts(),
    entities: {},
    diagnostics: {},
    journey: getSampleJourneyData()
  };
}

export const DEFAULT_ANN_DIMS: CustomAnnDims = {
  width: 320,
};

export const getSampleConfig = (elPath: string, grpId: string): IAnnotationConfig => {
  const isCoverAnn = elPath === '$';
  const id = getRandomId();

  return {
    selectionEffect: 'regular',
    annotationSelectionColor: DEFAULT_BLUE_BORDER_COLOR,
    id: isCoverAnn ? `$#${id}` : elPath,
    refId: id,
    grpId,
    zId: id,
    createdAt: getCurrentUtcUnixTime(),
    updatedAt: getCurrentUtcUnixTime(),
    bodyContent: '<p class="editor-paragraph" dir="ltr"><span style="font-size: 18px;">Write a brief description of what your buyer should expect from this particular module of your product.</span></p>',
    displayText: 'Write a brief description of what your buyer should expect from this particular module of your product.',
    positioning: AnnotationPositions.Auto,
    monoIncKey: 0,
    syncPending: true,
    type: isCoverAnn ? 'cover' : 'default',
    size: isCoverAnn ? 'medium' : 'small',
    customDims: DEFAULT_ANN_DIMS,
    isHotspot: !isCoverAnn,
    hideAnnotation: false,
    videoUrl: '', // legacy
    videoUrlHls: '',
    videoUrlMp4: '',
    videoUrlWebm: '',
    targetElCssStyle: '',
    annCSSStyle: '',
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
    buttonLayout: 'default',
    selectionShape: 'box',
    isLeadFormPresent: false,
    m_id: elPath,
    scrollAdjustment: 'auto',
    audio: null,
  };
};

export const isProdEnv = () => {
  const isProd = (process.env.REACT_APP_ENVIRONMENT === 'prod') || (process.env.REACT_APP_ENVIRONMENT === 'staging');
  return isProd;
};

export const getImgScreenData = () => ({
  version: '2023-01-10',
  vpd: {
    h: -1,
    w: -1
  },
  docTree: {
    type: 1,
    name: 'html',
    attrs: {
      lang: 'en',
      'fable-stf': '0',
      'fable-slf': '0',
      style: 'width: 100%; height: 100%;'
    },
    props: {},
    chldrn: [
      {
        type: 1,
        name: 'head',
        attrs: {
          'fable-stf': '0',
          'fable-slf': '0'
        },
        props: {},
        chldrn: [
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'meta',
            attrs: {
              charset: 'UTF-8',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'meta',
            attrs: {
              'http-equiv': 'X-UA-Compatible',
              content: 'IE=edge',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'meta',
            attrs: {
              name: 'viewport',
              content: 'width=device-width, initial-scale=1.0',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'title',
            attrs: {
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: [
              {
                type: 3,
                name: '#text',
                attrs: {},
                props: {
                  textContent: 'Image iframe'
                },
                chldrn: []
              }
            ]
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'style',
            attrs: {
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {
              cssRules: 'body { margin: 0px; padding: 0px; } #img { width: 100%; height: auto; } '
            },
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          }
        ]
      },
      {
        type: 8,
        name: '#text',
        attrs: {},
        props: {},
        chldrn: []
      },
      {
        type: 1,
        name: 'body',
        attrs: {
          'fable-stf': '0',
          'fable-slf': '0',
          style: 'visibility: visible;width: 100%; min-height: 100vh;display: flex;align-items: center;justify-content: center;'
        },
        props: {},
        chldrn: [
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'img',
            attrs: {
              id: 'img',
              src: '',
              style: 'box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.3);',
              alt: 'Image',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {
            },
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'div',
            attrs: {
              id: 'fable-0-cm-presence',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'div',
            attrs: {
              id: 'fable-0-de-presence',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: []
          },
          {
            type: 8,
            name: 'div',
            attrs: {
              style: '\n    \n    display: flex !important;\n    background-color: #7567FF !important;\n    top:-10000px; \n    left:-10000px;\n    position: fixed !important;\n    border-radius: 28px !important;\n    justify-content: center !important;\n    align-items: center !important;\n    padding: 8px 24px !important;\n    gap: 8px !important;\n    z-index: 9999999 !important;\n  \n    top: 670px !important;\n    left: 1297px !important;\n  ',
              class: 'fable-dont-ser',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: []
          }
        ]
      }
    ]
  }
});

export function hexToRGB(colorValue: string) {
  return {
    red: parseInt(colorValue.substring(1, 3), 16),
    green: parseInt(colorValue.substring(3, 5), 16),
    blue: parseInt(colorValue.substring(5, 7), 16),
  };
}

export const rgbToHex = (rgb: string) : string => {
  const rgbValues = rgb.match(/\d+/g);

  const r = parseInt(rgbValues![0], 10);
  const g = parseInt(rgbValues![1], 10);
  const b = parseInt(rgbValues![2], 10);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};
