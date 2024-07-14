import React, { ReactNode } from 'react';
import Button from '../../button';
import { EntryBase } from '../../../types';

interface Props {
  data: EntryBase['continueCTA'] | EntryBase['skipCTA'];
  onClick: () => void;
  disabled: boolean;
  icon?: ReactNode
}

function EntryButton(props: Props): JSX.Element {
  const getButtonIntent = () => {
    if (props.data.type === 'solid') return 'primary';
    if (props.data.type === 'outline') return 'secondary';
    return 'link';
  };

  return (
    <Button
      id={props.data.id}
      iconPlacement={props.data.iconPlacement}
      intent={getButtonIntent()}
      bgColor={props.data.style.bgColor}
      borderColor={props.data.style.borderColor}
      color={props.data.style.fontColor}
      borderRadius={props.data.style.borderRadius}
      className={`cta cta-${props.data.id}`}
      onClick={props.onClick}
      disabled={props.disabled}
      icon={props.icon}
    >
      {props.data.text}
    </Button>
  );
}

export default EntryButton;
