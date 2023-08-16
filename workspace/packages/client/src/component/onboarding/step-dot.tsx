import React from 'react';
import { Link } from 'react-router-dom';

interface Props {
    selected: boolean;
    to: string;
}

export default function StepDot({ selected, to }: Props): JSX.Element {
  return (
    <Link to={to}>
      <div
        style={{
          height: '0.375rem',
          width: `${selected ? '2rem' : '1rem'}`,
          backgroundColor: `${selected ? '#7567FF' : '#D9D9D9'}`,
          borderRadius: '0.5rem'
        }}
      />
    </Link>
  );
}
