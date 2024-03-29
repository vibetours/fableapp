import api from '@fable/common/dist/api';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import { FWin } from '../types';

export interface CBEventBase{
  ti: number;
  email: string;
}

export interface CBEventPayload<T extends CBEventBase> {
    event: string;
    payload: T;
}

export interface CBCtaClickEvent extends CBEventBase {
  cta_url: string;
  cta_txt: string;
  our_event_id: string;
  demo_url: string;
  demo_name: string;
}

export function logEventToCblt<T extends CBEventBase>(event: CBEventPayload<T>, rid: string): void {
  try {
    const globalSettings = (window as FWin).__fable_global_settings__ || {};
    if (!globalSettings.shouldLogEvent) return;
    api(`/vr/ct/evnt?rid=${rid}`, {
      auth: false,
      method: 'POST',
      body: event,
      noRespExpected: true,
    });
  } catch (err) {
    sentryCaptureException(err as Error);
  }
}

export function logEventToCbltToSetAppProperties<T extends CBEventBase>(event: CBEventPayload<T>): void {
  try {
    api('/vr/ct/evnt', {
      auth: true,
      method: 'POST',
      body: event,
      noRespExpected: true,
    });
  } catch (err) {
    sentryCaptureException(err as Error);
  }
}

// INFO these are cobalt events and needs to be sycned with that list
export enum CBEvents {
  CREATE_CONTACT = 'CREATAE_OR_UPDATE_CONTACT',
  CTA_CLICKED = 'CTA_CLICKED',
  CREATE_CONTACT_PROPERTIES_AND_GROUP = 'CREATE_CONTACT_PROPERTIES_AND_GROUP',
}
