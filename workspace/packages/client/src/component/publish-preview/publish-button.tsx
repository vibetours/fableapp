import React, { useEffect, useState } from 'react';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import Button from '../button';
import { P_RespTour } from '../../entity-processor';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';

interface Props {
  tour: P_RespTour | null;
  publishTour: (tour: P_RespTour) => Promise<boolean>;
  openShareModal: () => void;
  setIsPublishing: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPublishFailed: React.Dispatch<React.SetStateAction<boolean>>;
  size?: 'medium' | 'large';
  minWidth?: string;
  isPublishing?: boolean;
  disabled?: boolean;
}

export default function PublishButton(props: Props): JSX.Element {
  const [buttonTitle, setButtonTitle] = useState('Publish');

  const handleClick = async (): Promise<void> => {
    props.setIsPublishing(true);
    props.setIsPublishFailed(false);
    props.openShareModal();

    const res = await props.publishTour(props.tour!);
    props.setIsPublishing(false);

    traceEvent(AMPLITUDE_EVENTS.DEMO_PUBLISHED, {}, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);

    if (!res) {
      props.setIsPublishFailed(true);
    }
  };

  useEffect(() => {
    if (props.isPublishing) {
      setButtonTitle('Publishing...');
    } else {
      setButtonTitle('Publish');
    }
  }, [props.isPublishing]);

  return (
    <Button
      size={props.size || 'large'}
      disabled={props.disabled || !props.tour}
      style={{ height: '30px', paddingLeft: '1.2rem', paddingRight: '1.2rem', minWidth: props.minWidth }}
      onMouseUp={handleClick}
    >
      {buttonTitle}
    </Button>
  );
}
