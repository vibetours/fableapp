import React, { useState } from 'react';
import Tooltip from 'antd/lib/tooltip';
import { Button } from 'antd';
import {
  LoadingOutlined,
  HolderOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { ITourDataOpts } from '@fable/common/dist/types';
import ExpandArrowFilled from '../../assets/creator-panel/expand-arrow-filled.svg';
import * as PTags from '../screen-editor/styled';
import * as Tags from './styled';
import { AnnotationPerScreen, DestinationAnnotationPosition, IAnnotationConfigWithScreen, ScreenPickerData } from '../../types';
import { P_RespScreen } from '../../entity-processor';
import { AnnUpdateType } from './types';
import AddAnnFloatingBtn from './add-ann-floating-btn';

type Props = {
  config: IAnnotationConfigWithScreen;
  setSelectedAnnotationId: (annId: string) => void;
  resetSelectedAnnotationId: () => void;
  selectedAnnotationId: string;
  screen: P_RespScreen;
  goToSelectionMode: () => () => void;
  navigateToAnnotation: (uri: string) => void;
  showVerticalBar: boolean;
  isAnnotationDragged: boolean;
  setIsAnnotationDragged: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentSelectedAnnotation: (currentSelectedAnnotation: IAnnotationConfigWithScreen) => void;
  setDesinationAnnotation: (destinationAnnotation: IAnnotationConfigWithScreen) => void;
  setDesinationAnnotationPosition: (destinationAnnotationPosition: DestinationAnnotationPosition) => void;
  children: React.ReactNode;
  allAnnotationsForTour: AnnotationPerScreen[],
  reorderAnnotation: () => void,
  tourDataOpts: ITourDataOpts,
  applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void,
  setAlertMsg: (alertMsg?: string) => void,
  shouldShowScreenPicker: (screenPickerData: ScreenPickerData)=> void;
}

export enum HoveredSection {
  Top,
  Bottom,
  None
}

export default function TimelineItem(props: Props): JSX.Element {
  const {
    config,
    setSelectedAnnotationId,
    selectedAnnotationId,
    resetSelectedAnnotationId,
    goToSelectionMode,
    navigateToAnnotation,
    screen,
    showVerticalBar,
    isAnnotationDragged,
    setIsAnnotationDragged,
    setCurrentSelectedAnnotation,
    setDesinationAnnotation,
    setDesinationAnnotationPosition,
    reorderAnnotation,
    children,
    setAlertMsg,
    shouldShowScreenPicker
  } = props;

  const [showAddAnnButtons, setShowAddBtns] = useState(false);
  const [showBeforeAnnPopup, setShowBeforeAnnPopup] = useState(false);
  const [showAfterAnnPopup, setShowAfterAnnPopup] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<HoveredSection>(HoveredSection.None);

  const startAnnotationId = props.tourDataOpts.main.split('/')[1] || '';

  const handleMouseUp = (): void => {
    setIsAnnotationDragged(false);

    document.getElementById('cursor-style')?.remove();
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (): void => {
    window.addEventListener('mouseup', handleMouseUp);
    setIsAnnotationDragged(true);
    setCursorToGrabbing();
    setCurrentSelectedAnnotation(config);
  };

  const setCursorToGrabbing = (): void => {
    const cursorStyle = document.createElement('style');
    cursorStyle.innerHTML = '*{cursor: grabbing !important;}';
    cursorStyle.id = 'cursor-style';
    document.head.appendChild(cursorStyle);
  };

  return (
    <Tags.AnnotationItemCon
      isItemExpanded={selectedAnnotationId === config.refId}
      onMouseEnter={() => setShowAddBtns(true)}
      onMouseLeave={() => setShowAddBtns(false)}
    >
      <div
        onMouseDown={handleMouseDown}
        style={{ position: 'relative' }}
      >
        <AddAnnFloatingBtn
          position={DestinationAnnotationPosition.prev}
          allAnnotationsForTour={props.allAnnotationsForTour}
          annotation={config}
          tourDataOpts={props.tourDataOpts}
          hidePopup={() => setShowBeforeAnnPopup(false)}
          applyAnnButtonLinkMutations={props.applyAnnButtonLinkMutations}
          open={showBeforeAnnPopup}
          showAddAnnButtons={showAddAnnButtons}
          onOpenChange={(visible: boolean) => setShowBeforeAnnPopup(visible)}
          alignment="top"
          setAlertMsg={setAlertMsg}
          shouldShowScreenPicker={shouldShowScreenPicker}
        />

        <Tooltip
          placement="left"
          title={<span>Drag to reorder.</span>}
          overlayStyle={{ fontSize: '0.75rem' }}
        >
          <Button
            type="text"
            size="small"
            icon={<HolderOutlined style={{ opacity: '0.65' }} />}
            style={{ display: 'block' }}
          />
        </Tooltip>

        <AddAnnFloatingBtn
          position={DestinationAnnotationPosition.next}
          allAnnotationsForTour={props.allAnnotationsForTour}
          setAlertMsg={setAlertMsg}
          annotation={config}
          tourDataOpts={props.tourDataOpts}
          hidePopup={() => setShowAfterAnnPopup(false)}
          applyAnnButtonLinkMutations={props.applyAnnButtonLinkMutations}
          open={showAfterAnnPopup}
          showAddAnnButtons={showAddAnnButtons}
          onOpenChange={(visible: boolean) => setShowAfterAnnPopup(visible)}
          alignment="bottom"
          shouldShowScreenPicker={shouldShowScreenPicker}
        />

      </div>
      <Tags.AnnotationLI
        onMouseLeave={() => setHoveredSection(HoveredSection.None)}
        key={config.refId}
        style={{
          paddingBottom: selectedAnnotationId === config.refId ? '0.25rem' : '0.65rem',
          opacity: selectedAnnotationId === config.refId ? 1 : 0.65,
        }}
      >
        {/* this is top bar */}
        <Tags.TopHorizontalBar isAnnotationDragged={isAnnotationDragged} hoveredSection={hoveredSection} />

        <Tags.AnotCrtPanelSecLabel
          style={{ display: 'flex' }}
          onClick={() => {
            if (screen.id !== config.screen.id) {
              navigateToAnnotation(`${config.screen.id}/${config.refId}`);
            } else if (selectedAnnotationId === config.refId) {
              resetSelectedAnnotationId();
              goToSelectionMode()();
            } else {
              setSelectedAnnotationId(config.refId);
            }
          }}
        >
          <Tags.AnnDisplayText>
            {startAnnotationId === config.refId && (
              <Tooltip title="Tour starts here!" overlayStyle={{ fontSize: '0.75rem' }}>
                <HomeOutlined style={{ background: 'none' }} />
              </Tooltip>
            )}
            {config.displayText}
          </Tags.AnnDisplayText>
          {config.syncPending && (<LoadingOutlined />)}
          <img src={ExpandArrowFilled} height={20} width={20} alt="" />

          {/* this is top invisible div */}
          {
            config.refId !== selectedAnnotationId && (
              <Tags.TopInvisibleDiv
                onMouseEnter={() => setHoveredSection(HoveredSection.Top)}
                onMouseUp={() => {
                  if (isAnnotationDragged) {
                    setDesinationAnnotation(config);
                    setDesinationAnnotationPosition(DestinationAnnotationPosition.prev);
                    reorderAnnotation();
                    setIsAnnotationDragged(false);
                  }
                }}
              />
            )
          }

          {/* this is bottom invisible div */}
          {
            config.refId !== selectedAnnotationId && (
              <Tags.BottomInvisibleDiv
                onMouseEnter={() => setHoveredSection(HoveredSection.Bottom)}
                onMouseUp={() => {
                  if (isAnnotationDragged) {
                    setDesinationAnnotation(config);
                    setDesinationAnnotationPosition(DestinationAnnotationPosition.next);
                    reorderAnnotation();
                    setIsAnnotationDragged(false);
                  }
                }}
              />
            )
          }

        </Tags.AnotCrtPanelSecLabel>
        {children}
        {showVerticalBar && <PTags.VerticalBar />}

        {/* this is bottom bar */}
        <Tags.BottomHorizontalBar isAnnotationDragged={isAnnotationDragged} hoveredSection={hoveredSection} />
      </Tags.AnnotationLI>
    </Tags.AnnotationItemCon>
  );
}
