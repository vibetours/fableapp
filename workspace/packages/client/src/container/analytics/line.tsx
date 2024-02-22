import React, { ReactElement, useEffect, useRef } from 'react';
import { LineChart } from 'metrics-graphics';
import { SHORT_MONTHS } from '@fable/common/dist/utils';
import * as Tags from './styled';

interface Props {
  data: Array< { date: Date, value: number } >;
  width?: number;
  height?: number;
  chartId: string;
  yTooltipText: string;
  percentageScale?: boolean;
  isArea?: boolean;
}

function formatDateForDisplay(d: Date): string {
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export default function Line(props: Props): ReactElement {
  const conRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setTimeout(() => {
      const yScale = props.percentageScale ? {
        minValue: 0,
        maxValue: 100
      } : {};
      const _ = new LineChart({
        data: [props.data],
        area: props.isArea,
        yScale,
        yAxis: {
          tickCount: 2,
          compact: true,
          tickFormat: props.percentageScale ? (...params: any[]) => `${params[0]}%` : 'number'
        },
        xAxis: {
          extendedTicks: true,
          tickCount: 3,
          compact: true
        },
        colors: ['#7566ff'],
        width: props.width ?? 360,
        height: props.height ?? 120,
        target: `#${props.chartId}`,
        tooltipFunction: (point) => `${formatDateForDisplay(point.date)}: ${props.yTooltipText} ${point.value}${props.percentageScale ? '%' : ''}`
      });
    }, 1000);
  }, [props.data]);

  return (<Tags.LineCon
    id={props.chartId}
    ref={conRef}
    style={{
      height: props.height ?? 120,
      width: props.width ?? 360,
    }}
  />);
}
// background: '#f3f5f6'
