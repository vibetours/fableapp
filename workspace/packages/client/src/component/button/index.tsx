import React from 'react';
import * as Tags from './styled';

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  iconPlacement?: 'left' | 'right';
  intent?: 'primary' | 'secondary';
  size?: 'large' | 'medium' | 'small';
}

export default function Button({
  children,
  icon,
  iconPlacement,
  intent = 'primary',
  size = 'medium',
  ...rest
}: Props): JSX.Element {
  return (
    <Tags.ButtonCon
      intent={intent}
      size={size}
      {...rest}
    >
      {iconPlacement === 'left' ? (
        <>
          {icon}
          {children}
        </>
      ) : (
        <>
          {children}
          {icon}
        </>
      )}
    </Tags.ButtonCon>
  );
}
