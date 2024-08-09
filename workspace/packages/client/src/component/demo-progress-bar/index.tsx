/* eslint-disable no-mixed-operators */
import React, { useEffect, useState } from 'react';
import { ExtMsg, IframePos, InternalEvents, Payload_Navigation } from '../../types';
import * as Tags from './styled';
import { AnnotationSerialIdMap } from '../annotation/ops';

interface Props {
  iframePos: IframePos,
  annotationSerialIdMap: AnnotationSerialIdMap,
  bg: string;
  fg: string;
  textColor: string;
}
interface OnNavigationEvent extends Partial<Event> {
  detail?: Payload_Navigation
}

function DemoProgressBar(props: Props): JSX.Element {
  const [currentAnnotationIndex, setCurrentAnnotationIndex] = useState(0);
  const [totalAnnotations, setTotalAnnotations] = useState(0);

  const handleCurrentAnn = (evt: OnNavigationEvent): void => {
    if (evt.type === InternalEvents.OnNavigation && evt.detail) {
      const annRefId = evt.detail.currentAnnotationRefId;
      const currentAnn = props.annotationSerialIdMap[annRefId];
      setCurrentAnnotationIndex(currentAnn.absIdx);
    }
  };

  useEffect(() => {
    document.addEventListener(InternalEvents.OnNavigation, handleCurrentAnn);
    return () => {
      document.removeEventListener('message', handleCurrentAnn);
    };
  }, []);

  useEffect(() => {
    const serialMapKeys = Object.keys(props.annotationSerialIdMap);
    if (serialMapKeys.length === 0) return;
    const firstKey = serialMapKeys[0];
    const firstValue = props.annotationSerialIdMap[firstKey];
    setTotalAnnotations(firstValue.absLen);
  }, [props.annotationSerialIdMap]);

  const completion = Math.floor((currentAnnotationIndex + 1) / totalAnnotations * 100);
  return (
    <Tags.ProgressIndicatorCon
      data-progress={`${completion}% Completed. [${currentAnnotationIndex + 1}/${totalAnnotations} Steps seen]`}
      left={props.iframePos.left}
      top={props.iframePos.top}
      width={props.iframePos.width}
      color={props.textColor}
      bg={props.bg}
      fg={props.fg}
      completion={completion}
    />
  );
}

export default DemoProgressBar;
