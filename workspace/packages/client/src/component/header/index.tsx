import {
  BarChartOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  EditOutlined,
  LinkOutlined,
  LogoutOutlined,
  MoreOutlined,
  SaveOutlined,
  ShareAltOutlined,
  WarningFilled
} from '@ant-design/icons';
import { RespUser } from '@fable/common/dist/api-contract';
import { CmnEvtProp, ScreenDiagnostics } from '@fable/common/dist/types';
import { Tooltip, Button as AntButton, Drawer } from 'antd';
import React, { Dispatch, ReactElement, SetStateAction, Suspense, lazy, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import FableQuill from '../../assets/fable-quill.svg';
import FableLogo from '../../assets/fableLogo.svg';
import * as GTags from '../../common-styled';
import { P_RespTour } from '../../entity-processor';
import Input from '../input';
import * as Tags from './styled';
import { getIframeShareCode } from './utils';
import { TourMainValidity } from '../../types';

const PublishButton = lazy(() => import('../publish-preview/publish-button'));
const ShareTourModal = lazy(() => import('../publish-preview/share-modal'));

interface IOwnProps {
  rBtnTxt?: string;
  shouldShowFullLogo?: boolean;
  navigateToWhenLogoIsClicked?: string;
  titleElOnLeft?: ReactElement;
  leftElGroups?: ReactElement[];
  rightElGroups?: ReactElement[];
  principal?: RespUser | null;
  manifestPath: string;
  titleText?: string;
  showRenameIcon?: boolean;
  renameScreen?: (newVal: string) => void;
  tourMainValidity?: TourMainValidity;
  isAutoSaving?: boolean;
  canvasOptions?: {
    resetZoom: () => void;
    showAnnText: boolean;
    setShowAnnText: Dispatch<SetStateAction<boolean>>;
    downloadTourData: () => void;
  }
  publishOptions?: ReactElement;
  publishTour?: (tour: P_RespTour) => Promise<boolean>;
  tour: P_RespTour | null;
  onLogoClicked?: () => void;
  isJourneyCTASet?: boolean;
  lastAnnHasCTA?: boolean;
  screenDiagnostics?: ScreenDiagnostics[];
}

export type HeaderProps = IOwnProps;

const CMN_HEADER_GRP_STYLE = {
  display: 'flex',
  gap: '1rem'
};

const CMN_HEADER_GRP_DIVISION = {
  borderLeft: '1px solid #ffffff42',
  padding: '0.25rem 0.5rem'
};

function Header(props: IOwnProps): JSX.Element {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishFailed, setIsPublishFailed] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showRenameScreenModal, setShowRenameScreenModal] = useState(false);
  const [screenName, setScreenName] = useState(props.titleText || '');
  const [showWarningDrawer, setShowWarningDrawer] = useState(false);
  const [isWarningPresent, setIsWarningPresent] = useState(false);

  useEffect(() => {
    let isWarning = false;
    if (!props.isJourneyCTASet
    || !props.lastAnnHasCTA
    || props.tourMainValidity !== TourMainValidity.Valid
    || props.screenDiagnostics?.length) {
      isWarning = true;
    }
    setIsWarningPresent(isWarning);
  }, [props.isJourneyCTASet, props.lastAnnHasCTA, props.screenDiagnostics, props.tourMainValidity]);

  const handleRenameScreenModalOk = (): void => {
    const newVal = screenName.trim().replace(/\s+/, ' ');
    if (newVal.toLowerCase() === props.titleText!.toLowerCase()) {
      setShowRenameScreenModal(false);
      return;
    }
    props.renameScreen!(newVal);
    setShowRenameScreenModal(false);
  };

  const handleRenameScreenModalCancel = (): void => {
    setShowRenameScreenModal(false);
  };

  const handleRenameScreenFormSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    handleRenameScreenModalOk();
  };

  const showModal = (): void => {
    setIsModalVisible(true);
  };

  const closeModal = (): void => {
    setIsModalVisible(false);
  };

  return (
    <Suspense fallback={<></>}>
      <Tags.Con style={{ color: '#fff' }}>
        <Tags.LMenuCon style={CMN_HEADER_GRP_STYLE}>
          <div style={{ ...CMN_HEADER_GRP_STYLE, gap: '0.5rem' }}>
            {props.shouldShowFullLogo ? (
              <Tags.ConLogoImg src={FableLogo} alt="Fable logo" />
            ) : (
              <Link onClick={() => props.onLogoClicked && props.onLogoClicked()} to={props.navigateToWhenLogoIsClicked!}>
                <Tags.ConLogoImg
                  id="fable-logo-screen-editor"
                  src={FableQuill}
                  alt="Fable logo"
                  style={{ height: '2rem', cursor: 'pointer' }}
                />
              </Link>
            )}
            {
            props.titleElOnLeft
            && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                {props.titleElOnLeft}
                {props.showRenameIcon && (
                  <EditOutlined className="show-on-hover" onClick={() => setShowRenameScreenModal(true)} />
                )}
              </div>
            )
          }
          </div>
          <>
            {(props.leftElGroups || []).map((e, i) => (
              <div
                style={{ ...CMN_HEADER_GRP_STYLE, ...CMN_HEADER_GRP_DIVISION }}
                key={`lg-${i}`}
              >
                {e}
              </div>
            ))}
          </>
        </Tags.LMenuCon>
        <Tags.RMenuCon>
          <div style={{
            display: 'flex',
            justifyContent: 'end',
            padding: '0 0.5rem 0.25rem 0',
            animation: props.isAutoSaving ? 'blink 2s linear infinite' : 'none',
            visibility: props.isAutoSaving ? 'visible' : 'hidden'
          }}
          >
            <SaveOutlined style={{ color: 'white' }} />
          </div>
          {(props.rightElGroups || []).length > 0 && (
          <Tags.MenuItem style={{
            borderRight: '1px solid rgba(255, 255, 255, 0.3)',
            paddingRight: '16px',
            marginRight: '10px'
          }}
          >
            {(props.rightElGroups || []).map((e, i) => (
              <div
                style={{ ...CMN_HEADER_GRP_STYLE }}
                key={`lg-${i}`}
              >
                {e}
              </div>
            ))}
          </Tags.MenuItem>
          )}
          {props.tour && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginRight: '1rem',
            paddingRight: '1rem',
            borderRight: '1px solid #ffffff42'
          }}
          >
            {
              isWarningPresent && (
                <Tags.MenuItem>
                  <AntButton
                    size="small"
                    shape="circle"
                    type="text"
                    icon={<Tags.WarningIcon />}
                    onClick={(e) => {
                      setShowWarningDrawer(true);
                    }}
                  />
                </Tags.MenuItem>
              )
            }
            {
              props.tourMainValidity === TourMainValidity.Valid && (
                <>
                  <Tags.MenuItem style={{
                    borderRight: '1px solid rgba(255, 255, 255, 0.3)',
                    paddingRight: '16px'
                  }}
                  >
                    <AntButton
                      id="step-1"
                      size="small"
                      className="sec-btn"
                      type="default"
                      icon={<CaretRightOutlined
                        style={{ color: 'white' }}
                      />}
                      style={{
                        padding: '0 0.8rem',
                        height: '30px',
                        borderRadius: '16px',
                        backgroundColor: '#160245',
                        color: 'white'
                      }}
                      onClick={(e) => {
                        import('@fable/common/dist/amplitude').then((amp) => {
                          amp.traceEvent(AMPLITUDE_EVENTS.TOUR_PREVIEW_CLICKED, {
                            preview_clicked_from: 'header'
                          }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
                        }).catch((err) => {
                          console.log('error in amplitude event', err);
                        });
                        window.open(`/pp/demo/${props.tour?.rid}`)?.focus();
                      }}
                    >
                      Preview
                    </AntButton>
                  </Tags.MenuItem>
                  <Tags.MenuItem>
                    <Tooltip title="Embed demo" overlayStyle={{ fontSize: '0.75rem' }}>
                      <AntButton
                        id="step-2"
                        size="small"
                        shape="circle"
                        type="text"
                        icon={<ShareAltOutlined
                          style={{ color: 'white' }}
                        />}
                        onClick={(e) => {
                          showModal();
                        }}
                      />
                    </Tooltip>
                  </Tags.MenuItem>
                  <Tags.MenuItem>
                    <Tooltip title="Insights" overlayStyle={{ fontSize: '0.75rem' }}>
                      <Link to={`/a/demo/${props.tour.rid}`}>
                        <AntButton
                          size="small"
                          shape="circle"
                          type="text"
                          icon={<BarChartOutlined
                            style={{ color: 'white' }}
                          />}
                        />
                      </Link>
                    </Tooltip>
                  </Tags.MenuItem>
                </>
              )
            }
            {
              props.canvasOptions && (
                <Tags.MenuItem>
                  <Tags.StyledPopover
                    trigger="click"
                    content={
                      <Tags.CanvasOptionsCon>
                        <Tags.CanvasOption
                          type="button"
                          onClick={() => props.canvasOptions!.setShowAnnText((prev) => !prev)}
                        >
                          {props.canvasOptions.showAnnText ? 'Hide ' : 'Show '}
                          annotation text
                        </Tags.CanvasOption>
                        <Tags.CanvasOption
                          type="button"
                          onClick={props.canvasOptions.resetZoom}
                          style={{ borderBottom: 'none' }}
                        >
                          Reset canvas position
                        </Tags.CanvasOption>
                        <Tags.CanvasOption
                          type="button"
                          onClick={props.canvasOptions.downloadTourData}
                          style={{ borderBottom: 'none' }}
                        >
                          Download datafile
                        </Tags.CanvasOption>
                      </Tags.CanvasOptionsCon>
                    }
                  >
                    <div
                      style={{
                        color: 'white',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                      }}
                      id="step-3"
                    >
                      <AntButton
                        size="small"
                        shape="circle"
                        type="text"
                        icon={<MoreOutlined
                          style={{ color: 'white' }}
                        />}
                        onClick={(e) => {
                        }}
                      />
                    </div>
                  </Tags.StyledPopover>
                </Tags.MenuItem>
              )
            }
            {props.publishOptions && (props.publishOptions)}
            {props.publishTour && (
            <div
              className="publish-btn"
              style={{
                borderLeft: '1px solid rgba(255, 255, 255, 0.3)',
                paddingLeft: '16px'
              }}
            >
              <PublishButton
                setIsPublishFailed={setIsPublishFailed}
                setIsPublishing={setIsPublishing}
                publishTour={props.publishTour}
                tour={props.tour}
                size="medium"
                openShareModal={() => setIsModalVisible(true)}
              />
            </div>
            )}
          </div>
          )}

          {props.rBtnTxt && (
          <Tags.MenuItem>
            <AntButton shape="round" size="middle">
              {props.rBtnTxt}
            </AntButton>
          </Tags.MenuItem>
          )}
          {props.principal && (
          <Tags.MenuItem style={{ display: 'flex' }}>
            <Tags.StyledPopover
              trigger="click"
              placement="bottomRight"
              content={
                <div onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                >
                  <GTags.PopoverMenuItem nonit>
                    {`${props.principal.firstName} ${props.principal.lastName}`}
                    <div style={{ fontSize: '0.65rem' }}>{props.principal.email}</div>
                  </GTags.PopoverMenuItem>
                  <GTags.PopoverMenuItemDivider />
                  <GTags.PopoverMenuItem onClick={() => {
                    window.location.href = '/logout';
                  }}
                  >
                    <LogoutOutlined />&nbsp;&nbsp;Logout
                  </GTags.PopoverMenuItem>
                </div>
              }
            >
              <div
                style={{
                  color: 'white',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}
                id="step-3"
              >
                <GTags.Avatar glow sl src={props.principal?.avatar} alt="pic" referrerPolicy="no-referrer" />
                <CaretDownOutlined />
              </div>
            </Tags.StyledPopover>
          </Tags.MenuItem>
          )}
        </Tags.RMenuCon>

        {props.tour && props.publishTour && <ShareTourModal
          publishTour={props.publishTour}
          tour={props.tour!}
          height="100%"
          manifestPath={props.manifestPath}
          width="100%"
          relativeUrl={`/p/demo/${props.tour?.rid}`}
          isModalVisible={isModalVisible}
          closeModal={closeModal}
          openShareModal={() => setIsModalVisible(true)}
          copyUrl={getIframeShareCode('100%', '100%', `/p/demo/${props.tour?.rid}`)}
          embedClickedFrom="header"
        />}
        <GTags.BorderedModal
          style={{ height: '10px' }}
          title="Rename Screen"
          open={showRenameScreenModal}
          onOk={handleRenameScreenModalOk}
          onCancel={handleRenameScreenModalCancel}
        >
          <form
            onSubmit={handleRenameScreenFormSubmit}
            style={{ paddingTop: '0.75rem' }}
          >
            <Input
              label="What would you like to rename the screen?"
              id="renameScreen"
              value={screenName}
              onChange={e => setScreenName(e.target.value)}
            />
          </form>
        </GTags.BorderedModal>
        {showWarningDrawer
      && (
      <Drawer
        title="Fix the following items before you embed this demo"
        onClose={() => {
          setShowWarningDrawer(false);
        }}
        open={showWarningDrawer}
      >
        <>
          {props.tourMainValidity === TourMainValidity.Main_Not_Set
        && (
          <Tags.MainNotSetContent>
            <WarningFilled style={{ color: '#FF7450' }} />
            &nbsp; Entry point of the demo is not set.
            <a href="https://help.sharefable.com/Editing-Demos/Setting-an-Entry-Point" target="_blank" rel="noreferrer">
              <LinkOutlined /> Check here how to set the entry point.
            </a>
          </Tags.MainNotSetContent>
        )}
          {props.tourMainValidity === TourMainValidity.Journey_Main_Not_Present
        && (
          <Tags.MainNotSetContent>
            <WarningFilled style={{ color: '#FF7450' }} />
            &nbsp; Entry point of one of the modules is not valid. Please reset it.
          </Tags.MainNotSetContent>
        )}
          {props.tourMainValidity === TourMainValidity.Main_Not_Present
        && (
          <Tags.MainNotSetContent>
            <WarningFilled style={{ color: '#FF7450' }} />
            &nbsp; Entry point of the demo is not valid. Please reset it.
            <a href="https://help.sharefable.com/Editing-Demos/Setting-an-Entry-Point" target="_blank" rel="noreferrer">
              <LinkOutlined /> Check here how to set the entry point.
            </a>
          </Tags.MainNotSetContent>
        )}
          {!props.lastAnnHasCTA
        && (
          <Tags.MainNotSetContent>
            <WarningFilled style={{ color: '#FF7450' }} />
            &nbsp; Book a Demo CTA is not configured on the last annotation.
            <a href="https://help.sharefable.com/Editing-Demos/Call-to-Actions" target="_blank" rel="noreferrer">
              <LinkOutlined /> Check here how to configure a CTA with external URL
            </a>
          </Tags.MainNotSetContent>
        )}
          {!props.isJourneyCTASet
        && (
          <Tags.MainNotSetContent>
            <WarningFilled style={{ color: '#FF7450' }} />
            &nbsp; Book a Demo CTA is not configured for modules.
            <a href="https://help.sharefable.com/Editing-Demos/Module" target="_blank" rel="noreferrer">
              <LinkOutlined /> Check here how to configure a CTA with external URL for modules.
            </a>
          </Tags.MainNotSetContent>
        )}
        </>
        <>
          {
            props.screenDiagnostics && props.screenDiagnostics.length > 0 && (
              props.screenDiagnostics
                .filter(diag => diag.code === 100)
                .map((_, idx) => (
                  <Tags.MainNotSetContent key={idx}>
                    <WarningFilled style={{ color: '#FF7450' }} />
                    &nbsp; This screen was replaced by an image screen since we
                    encountered an issue while retrieving an interactive version of the page.
                    You can try rerecording the screen again.
                  </Tags.MainNotSetContent>
                ))
            )
          }
        </>
      </Drawer>
      )}
      </Tags.Con>
    </Suspense>
  );
}

export default Header;
