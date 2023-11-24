import { AnalyticsEvents, AnnotationBtnClickedPayload } from './analytics/types';
import {
  ExtMsg,
  InternalEvents,
  Payload_AnnotationNav,
  Payload_DemoLoadingFinished,
  Payload_DemoLoadingStarted,
  Payload_JourneySwitch
} from './types';
import { createIframeSrc, getGlobalData, postMessageForEvent } from './utils';
import { P_RespTour } from './entity-processor';
import { logEvent } from './analytics/utils';

type Payload_IE_AnnotationNav = Payload_AnnotationNav & AnnotationBtnClickedPayload;
type Payload_IE_JourneySwitch = Payload_JourneySwitch;
type Payload_IE_DemoLoadingStarted = Payload_DemoLoadingStarted;
type Payload_IE_DemoLoadingFinished = Payload_DemoLoadingFinished

type Payload_IE_All = Payload_IE_AnnotationNav
  | Payload_IE_JourneySwitch
  | Payload_IE_DemoLoadingStarted
  | Payload_IE_DemoLoadingFinished;

export function emitEvent<T>(
  ev: InternalEvents,
  payload: T
) : void {
  const event = new CustomEvent(ev, {
    detail: payload,
  });
  document.dispatchEvent(event);
}

const registeredListeners = {} as Record<InternalEvents, Array<<T extends Payload_IE_All>(payload: T) => void>>;

export function registerListenerForInternalEvent(ev: InternalEvents, fn: (payload: Payload_IE_All) => void): void {
  if (ev in registeredListeners) registeredListeners[ev].push(fn);
  else registeredListeners[ev] = [fn];
}

export function initInternalEvents() : void {
  registerListenerForInternalEvent(InternalEvents.OnAnnotationNav, (payload: Payload_IE_All) => {
    const demoData = getGlobalData('demo') as P_RespTour;
    const journeyName = getGlobalData('journeyName') || null;
    const tPayload = {
      ...payload,
      demoUrl: createIframeSrc(`/demo/${demoData.rid}`) || '',
      demoDisplayName: demoData.displayName || '',
      demoRid: demoData.rid || '',
      journeyName
    } as Payload_IE_AnnotationNav;
    const postMsgPayload: Payload_AnnotationNav = {
      currentAnnoationIndex: tPayload.currentAnnoationIndex,
      totalNumberOfAnnotationsInCurrentTimeline: tPayload.totalNumberOfAnnotationsInCurrentTimeline,
      journeyName: tPayload.journeyName,
      annotationConfig: tPayload.annotationConfig,
      demoDisplayName: tPayload.demoDisplayName,
      demoRid: tPayload.demoRid,
      demoUrl: tPayload.demoUrl
    };
    postMessageForEvent<Payload_AnnotationNav>(ExtMsg.OnAnnotationNav, postMsgPayload);
  });

  registerListenerForInternalEvent(InternalEvents.OnAnnotationNav, (payload: Payload_IE_All) => {
    const tPayload = payload as Payload_IE_AnnotationNav;
    const btnClickedPayload: AnnotationBtnClickedPayload = {
      tour_id: tPayload.tour_id,
      ann_id: tPayload.ann_id,
      btn_id: tPayload.btn_id,
      btn_type: tPayload.btn_type
    };
    logEvent(AnalyticsEvents.ANN_BTN_CLICKED, btnClickedPayload);
  });

  registerListenerForInternalEvent(InternalEvents.JourneySwitch, (payload: Payload_IE_All) => {
    const demoData = getGlobalData('demo') as P_RespTour;
    const tPayload = {
      ...payload,
      demoUrl: createIframeSrc(`/demo/${demoData.rid}`) || '',
      demoDisplayName: demoData.displayName || '',
      demoRid: demoData.rid || '',
    };
    postMessageForEvent(ExtMsg.JourneySwitch, tPayload as Payload_IE_JourneySwitch);
  });

  registerListenerForInternalEvent(InternalEvents.DemoLoadingStarted, (payload: Payload_IE_All) => {
    const demoData = getGlobalData('demo') as P_RespTour;
    const tPayload = {
      ...payload,
      demoUrl: createIframeSrc(`/demo/${demoData.rid}`) || '',
      demoDisplayName: demoData.displayName || '',
      demoRid: demoData.rid || '',
    };
    postMessageForEvent(ExtMsg.DemoLoadingStarted, tPayload as Payload_IE_DemoLoadingStarted);
  });

  registerListenerForInternalEvent(
    InternalEvents.DemoLoadingFinished,
    (payload: Payload_IE_All) => {
      const demoData = getGlobalData('demo') as P_RespTour;
      const tPayload = {
        ...payload,
        demoUrl: createIframeSrc(`/demo/${demoData.rid}`) || '',
        demoDisplayName: demoData.displayName || '',
        demoRid: demoData.rid || '',
      };
      postMessageForEvent(ExtMsg.DemoLoadingFinished, tPayload as Payload_IE_DemoLoadingFinished);
    }
  );

  // register event listener to document
  for (const name of Object.values(InternalEvents)) {
    document.addEventListener(name, (ev: Event) => {
      if (!(ev instanceof CustomEvent)) return;
      const cev = ev as CustomEvent;
      (registeredListeners[name] || []).forEach(fn => fn(cev.detail as Payload_IE_All));
    });
  }
}

export function disposeInternalEvents(): void {
  for (const name of Object.values(InternalEvents)) {
    registeredListeners[name] = [];
  }
}
