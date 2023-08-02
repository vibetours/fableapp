import React, { useRef, useState } from 'react';
import { ITourDataOpts } from '@fable/common/dist/types';
import * as Tags from './styled';
import TimelineScreen from './screen';
import TimelineItem from './item';
import { AnnotationPerScreen, ConnectedOrderedAnnGroupedByScreen, IAnnotationConfigWithScreen } from '../../types';
import { P_RespScreen } from '../../entity-processor';
import { reorderAnnotation } from '../annotation/ops';
import { AnnUpdateType, DestinationAnnotationPosition } from './types';

interface Props {
  timeline: ConnectedOrderedAnnGroupedByScreen;
  navigate: (uri: string) => void;
  screen: P_RespScreen;
  applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void;
  allAnnotationsForTour: AnnotationPerScreen[];
  tourDataOpts: ITourDataOpts;
  setSelectedAnnotationId: (annId: string) => void;
  resetSelectedAnnotationId: () => void;
  selectedAnnotationId: string;
  goToSelectionMode: () => () => void;
  children: JSX.Element;
  setAlertMsg: (alertMsg?: string) => void;
}

interface ReorderAnnotationProps {
  currentSelectedAnnotation: IAnnotationConfigWithScreen | null;
  destinationAnnotation: IAnnotationConfigWithScreen | null;
  destinationAnnotationPosition: DestinationAnnotationPosition | null;
}

const reorderAnnotationPropsInitialValue: ReorderAnnotationProps = {
  currentSelectedAnnotation: null,
  destinationAnnotation: null,
  destinationAnnotationPosition: null,
};

export default function Timeline(props: Props): JSX.Element {
  const reorderAnnotationPropsRef = useRef<ReorderAnnotationProps>({ ...reorderAnnotationPropsInitialValue });
  const [isAnnotationDragged, setIsAnnotationDragged] = useState<boolean>(false);

  const reorderAnnotationHandler = (): void => {
    const result = reorderAnnotation(
      {
        ...reorderAnnotationPropsRef.current.currentSelectedAnnotation!,
        screenId: reorderAnnotationPropsRef.current.currentSelectedAnnotation!.screen.id
      },
      reorderAnnotationPropsRef.current.destinationAnnotation!.refId,
      props.allAnnotationsForTour,
      props.tourDataOpts.main,
      reorderAnnotationPropsRef.current.destinationAnnotationPosition!,
    );

    if (result.status === 'denied') props.setAlertMsg(result.deniedReason);
    else props.applyAnnButtonLinkMutations(result);
  };

  return (
    <div style={{ overflowY: 'auto' }}>
      {props.timeline.map((connectedTimelines, k) => (
        <Tags.AnnTimelineCon key={k}>
          {connectedTimelines.map((timeline, i, arr) => (
            <div key={`${timeline[0].screen.id}/${i}`}>
              <TimelineScreen
                navigate={props.navigate}
                screen={timeline[0].screen}
                selected={props.screen.id === timeline[0].screen.id}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {timeline.map((config, j, arr2) => (
                  <TimelineItem
                    reorderAnnotation={reorderAnnotationHandler}
                    key={config.refId}
                    config={config}
                    setSelectedAnnotationId={props.setSelectedAnnotationId}
                    resetSelectedAnnotationId={props.resetSelectedAnnotationId}
                    selectedAnnotationId={props.selectedAnnotationId}
                    screen={props.screen}
                    goToSelectionMode={props.goToSelectionMode}
                    navigateToAnnotation={props.navigate}
                    showVerticalBar={!(i === arr.length - 1 && j === arr2.length - 1)}
                    allAnnotationsForTour={props.allAnnotationsForTour}
                    tourDataOpts={props.tourDataOpts}
                    isAnnotationDragged={isAnnotationDragged}
                    setIsAnnotationDragged={setIsAnnotationDragged}
                    setAlertMsg={props.setAlertMsg}
                    setCurrentSelectedAnnotation={
                      (currentSelectedAnnotation: IAnnotationConfigWithScreen) => {
                        reorderAnnotationPropsRef.current.currentSelectedAnnotation = currentSelectedAnnotation;
                      }
                    }
                    setDesinationAnnotation={
                      (destinationAnnotation: IAnnotationConfigWithScreen) => {
                        reorderAnnotationPropsRef.current.destinationAnnotation = destinationAnnotation;
                      }
                    }
                    setDesinationAnnotationPosition={
                      (destinationAnnotationPosition: DestinationAnnotationPosition) => {
                        reorderAnnotationPropsRef.current.destinationAnnotationPosition = destinationAnnotationPosition;
                      }
                    }
                    applyAnnButtonLinkMutations={props.applyAnnButtonLinkMutations}
                  >
                    {props.selectedAnnotationId === config.refId && (
                      <div style={{ color: 'black' }}>
                        {props.children}
                      </div>
                    )}

                  </TimelineItem>
                ))}
              </div>
            </div>
          ))}
        </Tags.AnnTimelineCon>
      ))}
    </div>
  );
}
