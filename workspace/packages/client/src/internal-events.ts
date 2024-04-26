import {
  AnalyticsEvents,
  AnalyticsEventsDirect,
  AnnotationBtnClickedPayload,
  CtaClickedInternal,
} from './analytics/types';
import {
  ExtMsg,
  InternalEvents,
  Payload_DemoLoadingFinished,
  Payload_DemoLoadingStarted,
  Payload_JourneySwitch,
  Payload_Navigation,
  JourneyNameIndexData,
  FWin,
} from './types';
import { createIframeSrc, postMessageForEvent } from './utils';
import { P_RespTour } from './entity-processor';
import { getUUID, logEvent, logEventDirect } from './analytics/utils';
import { CBCtaClickEvent, CBEventBase, CBEvents, logEventToCblt } from './analytics/handlers';
import { FableLeadContactProps, getGlobalData, saveGlobalUser } from './global';
import { IFRAME_BASE_URL } from './constants';

type Payload_IE_AnnotationNav = AnnotationBtnClickedPayload;
type Payload_IE_JourneySwitch = Payload_JourneySwitch;
type Payload_IE_DemoLoadingStarted = Payload_DemoLoadingStarted;
type Payload_IE_DemoLoadingFinished = Payload_DemoLoadingFinished;
type Payload_IE_Navigation = Payload_Navigation;
type Payload_IE_CtaClicked = CtaClickedInternal;

type Payload_IE_All = Payload_IE_AnnotationNav
  | Payload_IE_JourneySwitch
  | Payload_IE_DemoLoadingStarted
  | Payload_IE_DemoLoadingFinished
  | Payload_IE_Navigation
  | Payload_IE_CtaClicked
  | FableLeadContactProps;

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
  registerListenerForInternalEvent(InternalEvents.OnNavigation, (payload: Payload_IE_All) => {
    const journeyData = getGlobalData('journeyData') as JourneyNameIndexData;
    const journeyIndex = journeyData !== undefined ? journeyData.journeyIndex : -1;
    const tPayload = {
      ...payload,
      journeyIndex
    } as Payload_IE_Navigation;
    const postMsgPayload: Payload_Navigation = {
      journeyIndex: tPayload.journeyIndex,
      currentAnnotationRefId: tPayload.currentAnnotationRefId
    };
    postMessageForEvent<Payload_Navigation>(ExtMsg.OnNavigation, postMsgPayload);
  });

  // registerListenerForInternalEvent(InternalEvents.LeadAssign, paylaod: )

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

  registerListenerForInternalEvent(InternalEvents.LeadAssign, (payload: Payload_IE_All) => {
    const lead = payload as FableLeadContactProps;
    saveGlobalUser(lead);
    const demo = getGlobalData('demo') as P_RespTour;

    logEventToCblt<FableLeadContactProps & CBEventBase>({
      event: CBEvents.CREATE_CONTACT,
      payload: {
        ...lead,
        ti: demo.id
      },
    }, demo.rid);
    logEvent(AnalyticsEvents.ANN_USER_ASSIGN, {
      user_email: lead.email,
      tour_id: demo.id,
      others: lead
    });
  });

  registerListenerForInternalEvent(InternalEvents.OnCtaClicked, (payload: Payload_IE_All) => {
    const ctaClickedPayload = payload as CtaClickedInternal;
    const demo = getGlobalData('demo') as P_RespTour;
    const lead = ((window as FWin).__fable_global_user__ || {}) as FableLeadContactProps;

    if (!lead.email) return;

    if (demo) {
      logEventDirect(AnalyticsEventsDirect.CTA_CLICKED, {
        ctaFrom: ctaClickedPayload.ctaFrom,
        btnId: ctaClickedPayload.btnId,
        url: ctaClickedPayload.url,
        tourId: demo.id
      });

      logEventToCblt<CBCtaClickEvent>({
        event: CBEvents.CTA_CLICKED,
        payload: {
          cta_url: ctaClickedPayload.url,
          cta_txt: ctaClickedPayload.btnTxt,
          our_event_id: getUUID(),
          demo_url: `${process.env.REACT_APP_CLIENT_ENDPOINT}/${IFRAME_BASE_URL}/demo/${demo.rid}`,
          demo_name: demo.displayName,
          ti: demo.id,
          email: lead.email
        }
      }, demo.rid);
    }
  });

  registerListenerForInternalEvent(InternalEvents.JourneySwitch, (payload: Payload_IE_All) => {
    const tPayload = {
      ...payload,
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
      const tPayload = {
        ...payload,
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
