import React, { useState } from 'react';
import { Tooltip } from 'antd';
import Button from '../button';
import { P_RespTour } from '../../entity-processor';

interface Props {
  tour: P_RespTour | null;
  publishTour: (tour: P_RespTour) => Promise<boolean>;
  openShareModal: () => void;
  setIsPublishing: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPublishFailed: React.Dispatch<React.SetStateAction<boolean>>;
  size?: 'medium' | 'large';
}

export default function PublishButton(props: Props): JSX.Element {
  const [buttonTitle, setButtonTitle] = useState('Publish');

  const handleClick = async (): Promise<void> => {
    props.setIsPublishing(true);
    props.setIsPublishFailed(false);
    props.openShareModal();
    setButtonTitle('Publishing...');

    const res = await props.publishTour(props.tour!);
    props.setIsPublishing(false);
    setButtonTitle('Publish the demo now!');

    if (!res) {
      props.setIsPublishFailed(true);
    }
  };

  return (
    <Tooltip
      title="Just click publish and your tour will be published and ready to share."
      overlayInnerStyle={{ fontSize: '0.75rem', borderRadius: '2px' }}
      placement="bottom"
    >
      <Button
        size={props.size || 'large'}
        disabled={!props.tour}
        style={{ height: '30px', paddingLeft: '1.2rem', paddingRight: '1.2rem' }}
        onClick={handleClick}
      >
        {buttonTitle}
      </Button>
    </Tooltip>
  );
}
