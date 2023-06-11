import React from 'react';
import Tooltip from 'antd/lib/tooltip';
import { QuestionCircleOutlined } from '@ant-design/icons';
import * as Tags from './styled';
import * as GTags from '../../../../common-styled';

interface Props {
  title: string;
  helpText: string;
  active?: boolean;
  onClick?: () => void;
}

export default function TabItem({ title, active, onClick, helpText }: Props) {
  return (
    <Tags.TabItem onClick={onClick}>
      <Tags.TabTitle active={active}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
        >
          <div>
            {title}
          </div>
          <Tooltip
            placement="bottomRight"
            title={
              <GTags.Txt className="subsubhead" color="#fff">{helpText}</GTags.Txt>
          }
          >
            <QuestionCircleOutlined className="ht-icn" />
          </Tooltip>
        </div>
        <Tags.TabActiveHighlight active={active} />
      </Tags.TabTitle>
    </Tags.TabItem>
  );
}
