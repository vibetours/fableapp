import React from 'react';
import * as Tags from './styled';

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  iconPlacement?: 'left' | 'right';
  intent?: 'primary' | 'secondary';
}

export default function Button({ children, icon, iconPlacement, intent = 'primary', ...rest }: Props): JSX.Element {
  return (
    <Tags.ButtonCon
      intent={intent}
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
