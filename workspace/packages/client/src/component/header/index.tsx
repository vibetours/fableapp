import React, { ReactElement } from 'react';
import { Avatar, Button } from 'antd';
import { Link } from 'react-router-dom';
import { RespUser } from '@fable/common/dist/api-contract';
import { CaretDownOutlined, DownOutlined, LogoutOutlined } from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import * as Tags from './styled';
import FableQuill from '../../assets/fable-quill.svg';
import * as GTags from '../../common-styled';
import FableLogo from '../../assets/fableLogo.svg';

interface IOwnProps {
  rBtnTxt?: string;
  shouldShowFullLogo?: boolean;
  navigateToWhenLogoIsClicked?: string;
  titleElOnLeft?: ReactElement;
  leftElGroups: ReactElement[];
  showPreview?: string;
  principal?: RespUser | null;
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
          {props.titleElOnLeft && props.titleElOnLeft}
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
        {props.showPreview && (
        <Tags.MenuItem>
          <Button
            shape="round"
            size="middle"
            type="primary"
            style={{
              background: '#16023E',
            }}
            onClick={e => {
              window.open(props.showPreview)?.focus();
            }}
          >
            Get embed URL
          </Button>
        </Tags.MenuItem>
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
              <div style={{ color: 'white',
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
    </Tags.Con>
  );
}

export default Header;
