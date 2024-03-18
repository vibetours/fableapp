import { v4 as uuidv4 } from 'uuid';
import api from '@fable/common/dist/api';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import {
  CommonEventProps,
  AnalyticsEvents,
  PayloadTypeMap,
  EventLog,
  FlattendEventLog,
  FableAnalyticsLocalStoreKeys
} from './types';
import { FWin } from '../types';

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

// Generate a new session id after 10mins of inactivity
// WARN Use this sessionId only for analytics as session gets invalidated after expiry
export const getSessionId = (): string => {
  const sid = sessionStorage.getItem(FableAnalyticsLocalStoreKeys.SessionId);
  const expiry = sessionStorage.getItem(FableAnalyticsLocalStoreKeys.SessionIdExpireAt);
  // set session id expiry 10mins in future
  const expireAfterSeconds = 10 * 60;
  sessionStorage.setItem(
    FableAnalyticsLocalStoreKeys.SessionIdExpireAt,
    String(Math.floor((+new Date() / 1000) + expireAfterSeconds))
  );

  let sessionIdExpired = false;
  let expiryNum;
  if (expiry && Number.isFinite(expiryNum = +expiry) && expiryNum < Math.floor((+new Date() / 1000))) {
    sessionIdExpired = true;
  }

  if (!sid || sessionIdExpired) {
    const newSid = getUUID();
    sessionStorage.setItem(FableAnalyticsLocalStoreKeys.SessionId, newSid);
    return newSid;
  }

  return sid;
};

export const getUtcUnixTimestamp = (date: Date): number => (+date / 1000) | 0;

export const getTimezoneOffset = (date: Date): string => `${date.getTimezoneOffset()}`;

export const removeSessionId = (): void => {
  sessionStorage.removeItem(FableAnalyticsLocalStoreKeys.SessionId);
};

const getCommonEventProps = (date: Date, event: AnalyticsEvents): CommonEventProps => ({
  aid: getAnonymousUserId(),
  ...(event !== AnalyticsEvents.ANN_USER_ASSIGN ? { sid: getSessionId() } : {}),
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
        ...getCommonEventProps(new Date(), event)
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

export function formatTimeFromSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${seconds} ${seconds === 1 ? 'Sec' : 'Secs'}`;
  } if (remainingSeconds === 0) {
    return `${minutes} ${minutes === 1 ? 'Min' : 'Mins'}`;
  }
  return `${minutes} ${minutes === 1 ? 'Min' : 'Mins'} ${remainingSeconds} ${remainingSeconds === 1 ? 'Sec' : 'Secs'}`;
}
