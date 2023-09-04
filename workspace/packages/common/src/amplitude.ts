import { init, track, setUserId, reset } from '@amplitude/analytics-browser';
import { isProdEnv } from './utils';
import { CmnEvtProp } from './types';
import raiseDeferredError from './deferred-error';

export const initAmplitude = (): void => {
  if (!isProdEnv()) {
    return;
  }
  const API_KEY = process.env.REACT_APP_AMPLITUDE_KEY;

  if (!API_KEY) {
    raiseDeferredError(new Error('amplitude api key is not defined'));
    return;
  }
  init(API_KEY, {
    defaultTracking: false,
  });
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
  }, 0);
};

export const setAmplitudeUserId = (userId: string) => {
  if (!isProdEnv()) {
    return;
  }
  setUserId(userId);
};

export const resetAmplitude = () => {
  if (!isProdEnv()) {
    return;
  }
  reset();
};
