import React, { ReactElement, useEffect, useState } from 'react';
import { Bar as BarMark, AreaChart, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import * as Tags from './styled';

interface IDatum {
 x: number;
 y: number ;
}

interface Props {
  offset?: number | string;
  noPad?: boolean;
  xs: number[];
  ys: number[];
  height?: number;
  bg?: string;
  noAbs?: boolean;
}

function CustomTooltip(props: any) {
  if (!(props.active && props.payload && props.payload.length)) return null;
  const payload = props.payload[0].payload;
  return (
    <div
      style={{
        background: '#808080a6',
        padding: '0.5rem 0.75rem',
        fontSize: '0.85rem',
        borderRadius: '8px',
        color: 'white',
        backdropFilter: 'blur(2px)'
      }}
    >
      <code><b>{payload.x}%</b></code> users spent
      <br />
      <code><b>{Math.ceil(payload.y)}</b></code> seconds or less
    </div>
  );
}

export default function Bar(props: Props): ReactElement {
  const [data, setData] = useState<IDatum[]>([]);
  // const [zeroFilledData, setZeroFilledData] = useState<IDatum[]>([]);

  useEffect(() => {
    const d: IDatum[] = [];
    for (let i = 0; i < props.xs.length; i++) {
      d.push({
        x: props.xs[i],
        y: props.ys[i]
      });
    }
    setData(d);
  }, [props.xs, props.ys]);

  const bg = props.bg ?? '#ababc0';
  const axisLineColors = props.bg ?? '#747474';
  return (
    <Tags.ChartCon style={{ top: props.offset ?? '14.5rem', position: props.noAbs ? 'unset' : 'absolute' }}>
      <ResponsiveContainer width="100%" height={120} debounce={3}>
        <BarChart
          height={props.height ?? 160}
          data={data}
          margin={{
            top: props.noPad ? 4 : 10,
            bottom: props.noPad ? 4 : 20,
            left: props.noPad ? 4 : 50,
            right: props.noPad ? 4 : 50
          }}
          barGap={0}
          barCategoryGap={0}
        >
          <XAxis
            dataKey="x"
            axisLine={{ stroke: axisLineColors }}
            tick={{ fill: axisLineColors, fontSize: 'x-small' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <BarMark dataKey="y" fill={bg} stroke={bg} />
        </BarChart>

      </ResponsiveContainer>
    </Tags.ChartCon>
  );
}
