import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Payload_TrackerPos, ScreenSizeData } from '../../types';

interface Props {
  trackerPos: Payload_TrackerPos;
  screenSizeData: ScreenSizeData
}

interface Pos {
  x: number;
  y: number;
}

export default function TrackerBubble(props: Props) {
  const [toPos, setToPos] = useState<Pos>({ x: -9999, y: -9999 });
  const [display, setDisplay] = useState<'none' | 'inline-block'>('none');
  const ref = useRef<HTMLDivElement | null>(null);
  const timer = useRef<null | ReturnType<typeof setTimeout>>(null);
  const lastPosData = useRef<Payload_TrackerPos>({
    currentAnnotationRefId: '',
    annotationType: 'cover',
    x: -36,
    y: -36,
  });

  useEffect(() => {
    const pos = props.trackerPos;
    if (!pos) {
      // If tracker position is not recorded, don't show tracker
      setDisplay('none');
      return;
    }
    if (pos.annotationType === 'cover') {
      // For cover annotation we don't display trcker pos
      ref.current!.style.transition = 'none';
      setDisplay('none');
      lastPosData.current = {
        currentAnnotationRefId: props.trackerPos.currentAnnotationRefId,
        annotationType: 'cover',
        x: 0,
        y: 0,
      };
      return;
    }
    if (lastPosData.current.currentAnnotationRefId === 'cover') {
      console.log('here');
      ref.current!.style.transition = 'none';
      setToPos({ x: pos.x, y: pos.y });
      setDisplay('inline-block');
      lastPosData.current = {
        ...props.trackerPos
      };
      return;
    }

    ref.current!.style.transition = 'none';
    setToPos({ x: lastPosData.current.x, y: lastPosData.current.y });
    setDisplay('inline-block');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      ref.current!.style.transition = 'all 0.3s cubic-bezier(0.42, 0, 0.34, 0.99)';
      setToPos({ x: pos.x, y: pos.y });
    }, 32);
    lastPosData.current = {
      ...props.trackerPos
    };

    // eslint-disable-next-line consistent-return
    return () => {
      timer.current && clearTimeout(timer.current);
    };
  }, [props.screenSizeData, props.trackerPos]);

  return (
    <Bubble
      style={{
        display,
        left: `${(toPos.x * props.screenSizeData.scaleFactor) + props.screenSizeData.iframePos.left}px`,
        top: `${(toPos.y * props.screenSizeData.scaleFactor) + props.screenSizeData.iframePos.top}px`,
      }}
      ref={ref}
    />
  );
}

export const Bubble = styled.div`
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="48" viewBox="0 0 24 24"><path stroke="%23fff" stroke-width="1" fill="%23000" d="M4.5.79v22.42l6.56-6.57h9.29L4.5.79z"></path></svg>');
  width: 24px;
  height: 36px;
  position: absolute;
`;
