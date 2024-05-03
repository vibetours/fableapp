import { init, track, setUserId, reset } from '@amplitude/analytics-browser';
import posthog from 'posthog-js';
import { isProdEnv } from './utils';
import { CmnEvtProp } from './types';
import raiseDeferredError from './deferred-error';

export const initProductAnalytics = (): void => {
  if (!isProdEnv()) {
    return;
  }
  const API_KEY = process.env.REACT_APP_AMPLITUDE_KEY;
  const POSTHOG_KEY = process.env.REACT_APP_POSTHOG_KEY;

  if (!API_KEY) {
    raiseDeferredError(new Error('amplitude api key is not defined'));
  } else {
    init(API_KEY, {
      defaultTracking: false,
    });
  }

  if (!POSTHOG_KEY) {
    raiseDeferredError(new Error('posthog api key is not defined'));
  } else {
    posthog.init(
      POSTHOG_KEY,
      {
        api_host: 'https://us.i.posthog.com',
        autocapture: false,
      }
    );
  }
};

export const traceEvent = (eventName: string, eventProperties: Record<string, string | boolean | number | null>, commonEventProperties?: CmnEvtProp[]) : void => {
  if (!isProdEnv()) {
    return;
  }

  const finalEvenProperties = eventProperties;
  const data = JSON.parse(localStorage.getItem('fable/ep')!);
  commonEventProperties?.forEach((property) => {
    finalEvenProperties[property] = data[property];
  });
  setTimeout(() => {
    track(eventName, finalEvenProperties);
    posthog.capture(eventName, finalEvenProperties);
  }, 0);
};

export const setProductAnalyticsUserId = (userId: string) => {
  if (!isProdEnv()) {
    return;
  }
  posthog.identify(
    'user_id',
    { email: userId }
  );
  setUserId(userId);
};

export const resetProductAnalytics = () => {
  if (!isProdEnv()) {
    return;
  }
  reset();
  posthog.reset();
};
