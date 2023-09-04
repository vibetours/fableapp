import React from 'react';
import { Tour as AntTour, TourProps } from 'antd';
import './index.css';

export default function Tour(props: TourProps): JSX.Element {
  return (
    <AntTour {...props} rootClassName="styled-tour" />
  );
}
