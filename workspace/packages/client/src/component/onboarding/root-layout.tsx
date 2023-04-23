import React from 'react';
import FableLogo from '../../assets/onboarding/fable-logo.svg';
import Browser from '../../assets/onboarding/Browser.svg';
import * as Tags from './styled';

interface Props {
  children: React.ReactNode;
}

function VerticalStackedBars(): JSX.Element {
  return (
    <div style={{
      height: '100vh',
      position: 'absolute',
      zIndex: -1,
      top: 0,
      right: '21%'
    }}
    >
      <div style={{
        backgroundColor: '#FEDF64',
        width: '18rem',
        position: 'absolute',
        zIndex: '1',
        right: '7.625rem',
        height: '100vh'
      }}
      />
      <div style={{
        backgroundColor: '#7567FF',
        width: '18rem',
        position: 'absolute',
        right: '3.5rem',
        height: '100vh'
      }}
      />
      <div style={{
        backgroundColor: '#FF7450',
        width: '18rem',
        height: '100vh'
      }}
      />
    </div>
  );
}

export default function RootLayout({ children }: Props) {
  return (
    <Tags.RootLayoutCon>
      <VerticalStackedBars />
      <img
        style={{
          height: '2rem',
          position: 'absolute',
          top: '4.375rem'
        }}
        src={FableLogo}
        alt="fable logo"
      />
      <img
        src={Browser}
        alt="browser illustration"
        style={{
          position: 'absolute',
          right: '4.25%',
          width: '37rem',
          top: 'calc(50vh - 14rem)'
        }}
      />
      {children}
    </Tags.RootLayoutCon>
  );
}
