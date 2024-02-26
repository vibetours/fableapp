import { scaleTime } from 'd3-scale';
import { timeDay } from 'd3-time';
import { timeFormat } from 'd3-time-format';
import React, { ReactElement, useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import * as Tags from './styled';

interface IDatum {
 date: Date;
 value: number ;
}

interface Props {
  data: Array<IDatum>;
  height?: number;
}

const getTicks = (data: IDatum[]): number[] => {
  if (!data.length) return [];
  const domain = [data[0].date, data[data.length - 1].date];
  const scale = scaleTime().domain(domain).range([0, 1]);
  const ticks = scale.ticks(timeDay);
  return ticks.map(entry => +entry);
};

const tickFormat = timeFormat('%d %b');
const dateFormat = (time: Date): string => tickFormat(new Date(time));

const getTicksData = (data: IDatum[], ticks: number[]): IDatum[] => {
  const dataMap = new Map(data.map((i) => [+i.date, i]));
  const data2: IDatum[] = [];
  ticks.forEach((item) => {
    if (!dataMap.has(item)) data2.push({ date: new Date(item), value: 0 });
    else data2.push(dataMap.get(item)!);
  });
  return data2;
};

function CustomTooltip(props: any) {
  if (!(props.active && props.payload && props.payload.length)) return null;
  const payload = props.payload[0].payload;
  const day = timeFormat('%d %b %Y')(payload.date);
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
      <code><b>{payload.value}</b></code> sessions
      <br />
      on&nbsp;&nbsp;&nbsp;<code><b>{day}</b></code>
    </div>
  );
}

export default function Line(props: Props): ReactElement {
  const [ticks, setTicks] = useState<number[]>([]);
  const [zeroFilledData, setZeroFilledData] = useState<IDatum[]>([]);

  useEffect(() => {
    const ticksArr = getTicks(props.data);
    const completeData = getTicksData(props.data, ticksArr);
    setTicks(ticksArr);
    setZeroFilledData(completeData);
  }, [props.data]);

  return (
    <Tags.ChartCon>
      <ResponsiveContainer width="100%" height={160} debounce={3}>
        <AreaChart
          height={props.height ?? 160}
          data={zeroFilledData}
          margin={{ top: 10, bottom: 20, left: 10, right: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            angle={-45}
            textAnchor="end"
            dataKey="date"
            ticks={ticks}
            axisLine={{ stroke: '#747474' }}
            tick={{ fill: '#747474', fontSize: 'x-small' }}
            tickCount={ticks.length / 2}
            tickFormatter={dateFormat}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="value" fill="#16024547" stroke="#160245" strokeWidth={2} isAnimationActive={false} />
        </AreaChart>

      </ResponsiveContainer>
    </Tags.ChartCon>
  );
}
