import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import { AMPLITUDE_EVENTS } from './events';

export const amplitudeAddScreensToTour = (
  newScreensLength: number,
  from: 'ext' | 'app'
) : void => {
  traceEvent(AMPLITUDE_EVENTS.ADD_SCREENS_TO_TOUR, {
    num_screens_added: newScreensLength,
    from
  }, [CmnEvtProp.TOUR_URL, CmnEvtProp.EMAIL]);
};
