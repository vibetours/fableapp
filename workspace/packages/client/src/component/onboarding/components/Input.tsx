import React from 'react';
import * as Tags from './styled';

export interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function Input({ label, id, ...rest }: Props) {
  return (
    <Tags.InputContainer>
      <input
        id={id}
        {...rest}
      />
      <label className="label" htmlFor={id}>
        <div className="text">{label}</div>
      </label>
    </Tags.InputContainer>
  );
}
