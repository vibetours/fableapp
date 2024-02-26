// Ref: https://observablehq.com/d/7e58cf7c71d8d8b5
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { pointer as fromPointer, selectAll, select, Selection as D3Selection } from 'd3-selection';
import { scaleUtc, scaleLinear } from 'd3-scale';
import { extent, max, range } from 'd3-array';
import { format } from 'd3-format';
import { area, curveCatmullRom } from 'd3-shape';
import * as Tags from './styled';
import Bar from './bar';

const margin = { top: 20, right: 20, bottom: 30, left: 30 };

export interface IFunnelDatum {
  step: number;
  value: number;
  label: string ;
  fullLabel: string;
  p50: number;
  p75: number;
  p95: number;
}

interface Props {
  data: Array<IFunnelDatum>
}

interface AnnotationModal {
  coords: { x: number, width: number, height: number},
  data: IFunnelDatum & {
    conversionP: string;
  }
}

export default function Funnel(props: Props): ReactElement {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [annotationModal, setAnnotationModal] = useState<AnnotationModal | null>(null);

  useEffect(() => {
    const svg = select(svgRef.current);

    svg.append('linearGradient')
      .attr('id', 'temperature-gradient')
      .attr('gradientUnits', 'userSpaceOnUse');

    svg.append('path')
      .attr('class', 'orgn');
    svg.append('path')
      .attr('class', 'mirr');
  }, []);

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

    svg.select('linearGradient')
      .attr('x1', x(1))
      .attr('y1', 0)
      .attr('x2', x(5))
      .attr('y2', 0)
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#160245b8' },
        { offset: '100%', color: '#16024559' },
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

    svg.select('path.orgn')
      .datum(data2)
      .attr('fill', 'url(#temperature-gradient)')
      .transition()
      .attr('d', afn as any);

    const areaMirror = area()
      .curve(curve)
      .x((p: any) => x(p.step))
      .y0(y(0))
      .y1((p: any) => y(-p.value));

    svg.select('path.mirr')
      .datum(data2)
      .attr('fill', 'url(#temperature-gradient)')
      .transition()
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
          .append('text')
          .attr('class', 'lv')
          .attr('y', 0)
          .attr('style', `
            fill: #16023e;
            font-size: 22px;
          `);

        g
          .append('text')
          .attr('class', 'lp')
          .attr('y', 20)
          .attr('style', `
            fill: #16023e75;
            font-size: 18px;
          `);

        g
          .append('text')
          .attr('class', 'll')
          .attr('y', 40)
          .attr('style', `
            fill: #b4adc2;
            font-size: 12px;
          `);
      })
      .merge(gLables as any)
      .call(g => {
        g.select('text.lv')
          .text(({ value }) => format(',')(value)); // format number with k/m

        g.select('text.lp')
          .text(({ value }, index) => (index === 0 ? '' : value === 0 ? format('.1%')(0) : format('.1%')(value / data[0].value)));

        g.select('text.ll').text(d => d.label);
      });
    gLables.exit().remove();

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
          .on('mouseup', function () {
            const el = this;
            const elBox = el.getBoundingClientRect();
            const svgBBox = svgRef.current!.getBoundingClientRect();
            const idx = select(el).datum() as number - 1;
            const d = props.data[idx];
            let conv = '';
            console.log(d);
            if (idx > 0) {
              conv = format('.1%')(d.value / data[0].value);
            }
            setAnnotationModal({
              coords: { x: elBox.left - svgBBox.x, width: elBox.width, height: elBox.height },
              data: {
                ...d,
                conversionP: conv
              }
            });
          });
      });
  }, [props.data]);

  return (
    <>
      <svg
        style={{
          height: '100%',
          width: '100%',
          flexGrow: 1
        }}
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
      />
      {annotationModal && (
        <Tags.FunnelSelectOverlay
          onClick={() => setAnnotationModal(null)}
          style={{
            width: `${annotationModal.coords.width}px`,
            height: `${annotationModal.coords.height}px`,
            left: `${annotationModal.coords.x}px`,
            // INFO this 108px is height adjustment for padding of svg container
            top: '108px',
          }}
        >
          <div className="con">
            <div className="sess">{annotationModal.data.value} Sessions</div>
            {annotationModal.data.conversionP && (
              <div className="conv">{annotationModal.data.conversionP} <span className="x-sm">Retention rate at this point</span></div>
            )}
            <div className="ann-txt">{annotationModal.data.fullLabel}</div>
          </div>
          <div className="dist-chart">
            <div style={{ position: 'relative' }}>
              <div className="x-sm" style={{ padding: '0 4px', textAlign: 'center' }}>
                Distribution of time spent on this step
              </div>
              <Bar
                noPad
                bg="#fafafacc"
                offset="24px"
                height={120}
                xs={[50, 75, 95]}
                noAbs
                ys={[annotationModal.data.p50, annotationModal.data.p75, annotationModal.data.p95]}
              />
            </div>
          </div>
        </Tags.FunnelSelectOverlay>
      )}
    </>
  );
}
