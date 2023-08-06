import { DownOutlined, UpOutlined, QuestionCircleOutlined, ArrowDownOutlined, ArrowUpOutlined, CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import React, { JSXElementConstructor, ReactElement, useState } from 'react';
import Tooltip from 'antd/lib/tooltip';
import * as Tags from './styled';
import * as GTags from '../../common-styled';

interface IProps {
  icon?: ReactElement;
  title?: string;
  helpText?: string;
  withGutter?: boolean;
  alwaysOpen?: boolean
  sectionActionElWhenOpen?: ReactElement
}

function ActionPanel(props: React.PropsWithChildren<IProps>): JSX.Element {
  const [collapsed, setCollapsed] = useState(!props.alwaysOpen);

  return (
    <Tags.ActionPanel gutter={!!props.withGutter}>
      {props.title && (
        <Tags.ActionPanelTitleCon className={collapsed ? '' : 'selected'} onClick={() => setCollapsed(!collapsed)}>
          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
            <div className="title">
              {props.icon ? (<>{props.icon}&nbsp;&nbsp;</>) : ''}
              {props.title}
            </div>
            {props.helpText && (
            <Tooltip
              placement="bottomRight"
              title={
                <GTags.Txt className="subsubhead" color="#fff">{props.helpText}</GTags.Txt>
            }
            >
              <QuestionCircleOutlined className="ht-icn" />
            </Tooltip>
            )}
          </div>
          <div style={{
            display: 'flex',
            gap: '0.35rem',
            alignItems: 'center',
          }}
          >
            {!collapsed && props.sectionActionElWhenOpen && (props.sectionActionElWhenOpen)}
            {!props.alwaysOpen && (
              collapsed ? (
                <CaretDownOutlined style={{ fontSize: '0.75rem' }} />
              ) : (
                <CaretUpOutlined style={{ fontSize: '0.75rem' }} />
              )
            )}
          </div>
        </Tags.ActionPanelTitleCon>
      )}
      {!collapsed && (
        <div className="body" style={{ padding: '0.25rem 0' }}>
          {props.children}
        </div>
      )}
    </Tags.ActionPanel>
  );
}

export default ActionPanel;
