import React from 'react';
import Button from '../button';
import { IDemoHubConfigCta } from '../../types';
import { OurLink } from '../../common-styled';

interface Props {
  cta: IDemoHubConfigCta;
  className?: string;
  width?: string;
}

export default function Cta(props: Props): JSX.Element {
  if (props.cta.type === 'link') {
    return (
      <OurLink
        href={props.cta.link}
        target="_blank"
        rel="noreferrer"
        style={{
          width: props.width || 'fit-content',
          marginBottom: 0,
        }}
        className={props.className || ''}
      >
        {props.cta.text}
      </OurLink>
    );
  }

  return (
    <a
      href={props.cta.link}
      target="_blank"
      rel="noreferrer"
      style={{
        width: props.width || 'fit-content',
        display: 'block',
        textDecoration: 'none'
      }}
    >
      <Button
        id={props.cta.id}
        iconPlacement={props.cta.iconPlacement}
        intent={props.cta.type === 'solid' ? 'primary' : 'secondary'}
        bgColor={props.cta.style.bgColor}
        borderColor={props.cta.style.borderColor}
        color={props.cta.style.fontColor}
        borderRadius={props.cta.style.borderRadius}
        className={props.className || ''}
        style={{ width: props.width || 'auto' }}
      >
        {props.cta.text}
      </Button>
    </a>
  );
}
