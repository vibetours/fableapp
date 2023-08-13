import React, { ReactElement, useState } from 'react';
import { Avatar, Button, Modal } from 'antd';
import { Link } from 'react-router-dom';
import { RespUser } from '@fable/common/dist/api-contract';
import { CaretDownOutlined, CaretRightOutlined, EditOutlined, LogoutOutlined, SaveOutlined, ShareAltOutlined, WarningOutlined } from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import Tooltip from 'antd/lib/tooltip';
import * as Tags from './styled';
import FableQuill from '../../assets/fable-quill.svg';
import * as GTags from '../../common-styled';
import FableLogo from '../../assets/fableLogo.svg';
import { copyToClipboard, createIframe } from './utils';

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
  isAutoSaving?: boolean
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

function Header(props: IOwnProps) {
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

  const handleRenameScreenFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRenameScreenModalOk();
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const copyHandeler = () => {
    const text = createIframe(props.showPreview);
    copyToClipboard(text);
    closeModal();
  };

  return (
    <Tags.Con style={{ color: '#fff' }}>
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
                { props.showRenameIcon && (<EditOutlined className="show-on-hover" onClick={() => setShowRenameScreenModal(true)} />)}
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
          <div style={{ display: 'flex', marginRight: '1rem', paddingRight: '1rem', borderRight: '1px solid #ffffff42' }}>
            {
              !props.isTourMainSet && (
              <Tags.MenuItem>
                <Tooltip title="Starting point is not set for this tour" overlayStyle={{ fontSize: '0.75rem' }}>
                  <Button
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

            <Tags.MenuItem>
              <Tooltip title="Preview" overlayStyle={{ fontSize: '0.75rem' }}>
                <Button
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
                <Button
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
          </div>
        )}
        {props.rBtnTxt && (
          <Tags.MenuItem>
            <Button shape="round" size="middle">
              {props.rBtnTxt}
            </Button>
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
      {props.showPreview && (
        <Tags.ShareModal
          className="share-modal"
          title="Get embed code"
          open={isModalVisible}
          onCancel={closeModal}
          centered
          width={486}
          footer={[
            <div style={{ display: 'flex' }} key="footer-buttons">
              <Tags.SMButton
                key="cancel"
                shape="round"
                size="middle"
                type="primary"
                style={{
                  background: 'white',
                  color: '#16023E',
                  border: '1px solid #16023E',
                }}
                onClick={closeModal}
              >
                Cancel
              </Tags.SMButton>
              <Tags.SMButton
                key="copy"
                shape="round"
                size="middle"
                type="primary"
                style={{
                  background: '#7567FF',
                  color: 'white',
                  border: 'none',
                }}
                onClick={() => copyHandeler()}
              >
                Copy
              </Tags.SMButton>
            </div>,
          ]}
          closable={false}
        >
          <Tags.SMText>
            {createIframe(props.showPreview)}
          </Tags.SMText>
        </Tags.ShareModal>
      )}
      <Modal
        title="Rename Screen"
        open={showRenameScreenModal}
        onOk={handleRenameScreenModalOk}
        onCancel={handleRenameScreenModalCancel}
      >
        <form onSubmit={handleRenameScreenFormSubmit}>
          <label htmlFor="renameTour">
            What would you like to rename the screen?
            <input
              id="renameScreen"
              style={{
                marginTop: '0.75rem',
                fontSize: '1rem',
                padding: '0.75rem',
                borderRadius: '2px',
                width: 'calc(100% - 2rem)'
              }}
              value={screenName}
              onChange={e => setScreenName(e.target.value)}
            />
          </label>
        </form>
      </Modal>
    </Tags.Con>
  );
}

export default Header;
