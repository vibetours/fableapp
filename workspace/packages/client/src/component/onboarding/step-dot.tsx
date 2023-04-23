import React from 'react';

interface Props {
    selected: boolean;
}

export default function StepDot({ selected }: Props) {
  return (
    <div
      style={{
        height: '0.375rem',
        width: `${selected ? '2rem' : '1rem'}`,
        backgroundColor: `${selected ? '#7567FF' : '#D9D9D9'}`,
        borderRadius: '0.5rem'
      }}
    />
  );
}
