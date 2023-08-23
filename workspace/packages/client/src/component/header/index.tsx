import React, { ReactElement, useState } from 'react';
import { Button as AntButton, notification } from 'antd';
import { Link } from 'react-router-dom';
import { RespUser } from '@fable/common/dist/api-contract';
import {
  CaretDownOutlined,
  CaretRightOutlined,
  EditOutlined,
  LogoutOutlined,
  SaveOutlined,
  ShareAltOutlined,
  WarningOutlined
} from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import Tooltip from 'antd/lib/tooltip';
import * as Tags from './styled';
import FableQuill from '../../assets/fable-quill.svg';
import * as GTags from '../../common-styled';
import FableLogo from '../../assets/fableLogo.svg';
import { copyToClipboard, createIframe, createIframeSrc } from './utils';
import IframeCodeSnippet from './iframe-code-snippet';
import Button from '../button';
import Input from '../input';
import ShareTourModal from '../tour/share-tour-modal';

interface IOwnProps {
  rBtnTxt?: string;
  shouldShowFullLogo?: boolean;
  navigateToWhenLogoIsClicked?: string;
  titleElOnLeft?: ReactElement;
  leftElGroups: ReactElement[];
  showPreview?: string;
  principal?: RespUser | null;
  titleText?: string;
  showRenameIcon?: boolean;
  renameScreen?: (newVal: string) => void;
  isTourMainSet?: boolean;
  isAutoSaving?: boolean;
  warnings?: string[]
}

type IProps = IOwnProps;

const CMN_HEADER_GRP_STYLE = {
  display: 'flex',
  gap: '1rem'
};

const CMN_HEADER_GRP_DIVISION = {
  borderLeft: '1px solid #ffffff42',
  padding: '0.25rem 0.5rem'
};

function Header(props: IOwnProps): JSX.Element {
  const [notificationApi, notificationContextHolder] = notification.useNotification();

  const [isModalVisible, setIsModalVisible] = useState(false);

  const [showRenameScreenModal, setShowRenameScreenModal] = useState(false);
  const [screenName, setScreenName] = useState(props.titleText || '');

  const handleRenameScreenModalOk = () => {
    const newVal = screenName.trim().replace(/\s+/, ' ');
    if (newVal.toLowerCase() === props.titleText!.toLowerCase()) {
      setShowRenameScreenModal(false);
      return;
    }
    props.renameScreen!(newVal);
    setShowRenameScreenModal(false);
  };

  const handleRenameScreenModalCancel = () => {
    setShowRenameScreenModal(false);
  };

  const handleRenameScreenFormSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    handleRenameScreenModalOk();
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const copyHandler = async (): Promise<void> => {
    const text = createIframe(props.showPreview);
    await copyToClipboard(text);
    closeModal();
    notificationApi.success({
      message: 'Copied to clipboard',
      duration: 1.5,
    });
  };

  return (
    <Tags.Con style={{ color: '#fff' }}>
      {notificationContextHolder}
      <Tags.LMenuCon style={CMN_HEADER_GRP_STYLE}>
        <div style={{ ...CMN_HEADER_GRP_STYLE, gap: '0.5rem' }}>
          {props.shouldShowFullLogo ? (
            <Tags.ConLogoImg src={FableLogo} alt="Fable logo" />
          ) : (
            <Link to={props.navigateToWhenLogoIsClicked!}>
              <Tags.ConLogoImg src={FableQuill} alt="Fable logo" style={{ height: '2rem', cursor: 'pointer' }} />
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
          {props.leftElGroups.map((e, i) => (
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
        {props.showPreview && (
          <div style={{
            display: 'flex',
            marginRight: '1rem',
            paddingRight: '1rem',
            borderRight: '1px solid #ffffff42'
          }}
          >
            {
              props.warnings && props.warnings.length > 0 && (
                <Tags.MenuItem>
                  <Tooltip
                    title={(
                      <>
                        { props.warnings.map((warning, i) => <div style={{ marginBottom: '1rem' }} key={i}>- {warning}</div>)}
                      </>)}
                    overlayStyle={{ fontSize: '0.8rem' }}
                    overlayInnerStyle={{ padding: '1rem' }}
                  >
                    <AntButton
                      size="small"
                      shape="circle"
                      type="text"
                      icon={<WarningOutlined
                        style={{ color: 'white' }}
                      />}
                      onClick={(e) => {
                      }}
                    />
                  </Tooltip>
                </Tags.MenuItem>
              )
            }

            {
              props.isTourMainSet && (
                <>
                  <Tags.MenuItem>
                    <Tooltip title="Preview" overlayStyle={{ fontSize: '0.75rem' }}>
                      <AntButton
                        size="small"
                        shape="circle"
                        type="text"
                        icon={<CaretRightOutlined
                          style={{ color: 'white' }}
                        />}
                        onClick={(e) => {
                          window.open(props.showPreview)?.focus();
                        }}
                      />
                    </Tooltip>
                  </Tags.MenuItem>
                  <Tags.MenuItem>
                    <Tooltip title="Embed" overlayStyle={{ fontSize: '0.75rem' }}>
                      <AntButton
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
                </>
              )
            }
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
            <Popover
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
              <div style={{
                color: 'white',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
              >
                <GTags.Avatar glow sl src={props.principal?.avatar} alt="pic" referrerPolicy="no-referrer" />
                <CaretDownOutlined />
              </div>
            </Popover>
          </Tags.MenuItem>
        )}
      </Tags.RMenuCon>
      {
        props.showPreview && (
          <ShareTourModal
            relativeUrl={props.showPreview}
            isModalVisible={isModalVisible}
            closeModal={closeModal}
            copyHandler={copyHandler}
          />
        )
      }
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
    </Tags.Con>
  );
}

export default Header;
