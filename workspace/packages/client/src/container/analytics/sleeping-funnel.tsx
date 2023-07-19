// Ref: https://observablehq.com/d/7e58cf7c71d8d8b5
import React, { ReactElement, useEffect, useRef } from 'react';
import { pointer as fromPointer, selectAll, select, Selection as D3Selection } from 'd3-selection';
import { scaleUtc, scaleLinear } from 'd3-scale';
import { extent, max, range } from 'd3-array';
import { format } from 'd3-format';
import { area, curveCatmullRom } from 'd3-shape';

const margin = { top: 20, right: 20, bottom: 30, left: 30 };

interface Props {
  data: Array<{ step: number, value: number, label: string }>
}

export default function Funnel(props: Props): ReactElement {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const box = svgRef.current?.getBoundingClientRect()!;

    const data = props.data;
    const data2: Array<{
      step: number;
      value: number;
      label?: string;
    }> = [];
    const ledge = 0.1;
    data.forEach((point, index) => {
      const { step, value } = point;
      if (index !== 0) {
        data2.push({ step: step - ledge, value });
      }
      data2.push(point);
      if (index !== data.length - 1) {
        data2.push({ step: step + ledge, value });
      } else {
        data2.push({ step: step + 1, value });
      }
    });

    const x = scaleUtc()
      .domain(extent(data2, ({ step }) => step) as any)
      .range([margin.left, box.width - margin.right]);

    const y = scaleLinear()
      .domain([-max(data, ({ value }) => value)!, max(data, ({ value }) => value)] as any).nice()
      .range([box.height - margin.bottom, margin.top]);

    const svg = select(svgRef.current);

    svg.append('linearGradient')
      .attr('id', 'temperature-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', x(1))
      .attr('y1', 0)
      .attr('x2', x(5))
      .attr('y2', 0)
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#7567FF' },
        { offset: '100%', color: '#7567FFaa' },
      ])
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color);

    const curve = curveCatmullRom.alpha(0.999999999);

    const afn = area()
      .curve(curve)
      .x((p: any) => x(p.step))
      .y0(y(0))
      .y1((p: any) => y(p.value));

    svg.append('path')
      .datum(data2)
      .attr('fill', 'url(#temperature-gradient)')
      .attr('d', afn as any);

    const areaMirror = area()
      .curve(curve)
      .x((p: any) => x(p.step))
      .y0(y(0))
      .y1((p: any) => y(-p.value));

    svg.append('path')
      .datum(data2)
      .attr('fill', 'url(#temperature-gradient)')
      .attr('d', areaMirror as any);

    const gLables = svg
      .selectAll('g.label')
      .data(data, d => (d as any).step);
    gLables
      .enter()
      .append('g')
      .attr('class', 'label')
      .attr('transform', p => `translate(${x(p.step) + 10}, 30)`)
      .call(g => {
        g
          // .selectAll('text.lv')
          // .data(g.data())
          // .enter()
          .append('text')
          .attr('class', 'lv')
          .attr('y', 0)
          .text(({ value }) => format(',')(value)) // format number with k/m
          .attr('style', `
            fill: #16023e;
            font-size: 22px;
          `);

        g
          // .selectAll('text.lp')
          // .data(g.data())
          // .enter()
          .append('text')
          .attr('class', 'lp')
          .attr('y', 20)
          .text(({ value }, index) => (index === 0 ? '' : format('.1%')(value / data[0].value)))
          .attr('style', `
            fill: #16023e75;
            font-size: 18px;
          `);

        g
          // .selectAll('text.ll')
          // .data(g.data(), d => (d as any).step)
          // .enter()
          .append('text')
          .attr('class', 'll')
          // .attr('x', ({ step }) => x(step) + 10)
          .attr('y', 40)
          .text(d => d.label)
          .attr('style', `
            fill: #b4adc2;
            font-size: 12px;
          `);
      })
      .merge(gLables as any)
      .exit()
      .remove();

    svg.selectAll('line')
      .data(range(2, data.length + 1))
      .enter()
      .append('line')
      .attr('x1', value => x(value))
      .attr('y1', 10)
      .attr('x2', value => x(value))
      .attr('y2', box.height - 30)
      .style('stroke-width', 1)
      .style('stroke', '#16023e17')
      .style('fill', 'none');

    const gMask = svg
      .selectAll('g.ie')
      .data([range(1, data.length + 1)]);
    gMask
      .enter()
      .append('g')
      .attr('class', 'ie')
      .merge(gMask as any)
      .call(g => {
        const r = g
          .selectAll('rect')
          .data(g.datum());

        r.enter()
          .append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('height', box.height - 30)
          .attr('width', x(3) - x(2))
          .attr('transform', v => `translate(${x(v)}, 0)`)
          .attr('fill', 'transparent')
          .attr('style', 'cursor: pointer;')
          .on('mouseover', function () {
            const sel = select(this);
            sel.attr('fill', '#d0d0ff38');
          })
          .on('mouseout', function () {
            const sel = select(this);
            sel.attr('fill', 'transparent');
          })
          .on('mouseup', (d, step) => {
            // show annotation here
          });
      });
  }, []);

  return (
    <svg
      style={{
        height: '100%',
        width: '100%',
        flexGrow: 1
      }}
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
    />
  );
}
