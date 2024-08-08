import React, { useEffect, useState } from 'react';
import { ExtMsg, IframePos, InternalEvents, Payload_Navigation } from '../../types';
import * as Tags from './styled';
import { AnnotationSerialIdMap } from '../annotation/ops';

interface Props {
    iframePos: IframePos,
    primaryColor: string,
    annotationSerialIdMap: AnnotationSerialIdMap,
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

  return (
    <Tags.ProgressIndicatorCon
      left={props.iframePos.left}
      top={props.iframePos.top}
      width={props.iframePos.width}
    >
      {Array.from({ length: totalAnnotations }, (_, index) => (
        <Tags.ProgressIndicator
          key={index}
          width={props.iframePos.width / totalAnnotations}
          currentIndex={index}
          activeIndex={currentAnnotationIndex}
          primaryColor={props.primaryColor}
        />
      ))}
    </Tags.ProgressIndicatorCon>
  );
}

export default DemoProgressBar;
