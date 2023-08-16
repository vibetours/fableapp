import React, { RefObject } from 'react';
import * as Tags from './styled';

export interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  innerRef?: RefObject<HTMLInputElement>;
  icon?: React.ReactNode;
}

export default function Input({ label, id, innerRef, icon, ...rest }: Props): JSX.Element {
  return (
    <Tags.InputContainer>
      {icon && (
        <Tags.IconWrapper>
          {icon}
        </Tags.IconWrapper>
      )}
      <input
        placeholder={rest.placeholder || ''}
        id={id}
        {...rest}
        ref={innerRef}
        style={{ paddingLeft: (icon ? '2.5rem' : '1rem') }}
      />
      <label className="label" htmlFor={id} style={{ paddingLeft: (icon ? '1.5rem' : '0rem') }}>
        <div className="text">{label}</div>
      </label>
    </Tags.InputContainer>
  );
}
