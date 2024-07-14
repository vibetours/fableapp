import React from 'react';

interface SectionTitleProps {
  type?: 'h2' | 'h3' | 'h4',
  children: React.ReactNode;
}
export function SectionTitle(props: SectionTitleProps): JSX.Element {
  return (
    <div
      style={{
        position: 'relative'
      }}
    >

      <span
        style={{
          backgroundColor: 'white',
          padding: '0 0.5rem',
          marginLeft: '2rem',
        }}
        className={props.type ? `typ-${props.type}` : 'typ-h2'}
      >
        {props.children}
      </span>
      <div
        style={{
          borderBottom: '2px solid lightgray',
          position: 'absolute',
          width: '100%',
          top: '50%',
          zIndex: -10
        }}
      />
    </div>
  );
}
