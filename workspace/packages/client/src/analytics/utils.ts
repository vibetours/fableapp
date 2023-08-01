import { v4 as uuidv4 } from 'uuid';
import api from '@fable/common/dist/api';
import { ResponseStatus } from '@fable/common/dist/api-contract';
import {
  CommonEventProps,
  AnalyticsEvents,
  PayloadTypeMap,
  EventLog,
  FlattendEventLog,
  FableAnalyticsLocalStoreKeys
} from './types';
import { FWin } from '../types';
import raiseDeferredError from '../deferred-error';

export const getUUID = (): string => uuidv4().replace(/\W+/g, '');

export const getAnonymousUserId = (): string => {
  const aid = localStorage.getItem(FableAnalyticsLocalStoreKeys.AnonymousUserId);
  if (!aid) {
    const newAid = getUUID();
    localStorage.setItem(FableAnalyticsLocalStoreKeys.AnonymousUserId, newAid);
    return newAid;
  }
  return aid;
};

export const getSessionId = (): string => {
  const sid = sessionStorage.getItem(FableAnalyticsLocalStoreKeys.SessionId);
  if (!sid) {
    const newSid = getUUID();
    sessionStorage.setItem(FableAnalyticsLocalStoreKeys.SessionId, newSid);
    return newSid;
  }
  return sid;
};

export const getUtcUnixTimestamp = (date: Date): number => {
  const utcNow = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
  return (+utcNow / 1000) | 0;
};

export const getTimezoneOffset = (date: Date): string => `${date.getTimezoneOffset()}`;

export const removeSessionId = (): void => {
  sessionStorage.removeItem(FableAnalyticsLocalStoreKeys.SessionId);
};

const getCommonEventProps = (date: Date): CommonEventProps => ({
  aid: getAnonymousUserId(),
  sid: getSessionId(),
  uts: getUtcUnixTimestamp(date),
  tz: getTimezoneOffset(date)
});

export const logEvent = (event: AnalyticsEvents, payload: PayloadTypeMap[typeof event]): void => {
  setTimeout(() => {
    try {
      const globalSettings = (window as FWin).__fable_global_settings__ || {};
      if (!globalSettings.shouldLogEvent) return;
      const data: EventLog = {
        event,
        payload,
        ...getCommonEventProps(new Date())
      };
      const eventLogs = flattenLogEvent(data);
      const sub = encodeURIComponent(btoa(eventLogs.event));
      api(`/lue?sub=${sub}`, {
        auth: false,
        method: 'POST',
        body: eventLogs,
        noRespExpected: true,
      });
    } catch (e) {
      raiseDeferredError(e as Error);
    }
  }, 0);
};

export const flattenLogEvent = (logs: EventLog): FlattendEventLog => {
  const { payload, ...rest } = logs;
  const flattenedPayload = Object.keys(payload).reduce((acc, key) => {
    acc[`payload_${key}` as keyof typeof acc] = payload[key as keyof typeof payload];
    return acc;
  }, {} as Record<string, string | number>);
  return { ...rest, ...flattenedPayload };
};
