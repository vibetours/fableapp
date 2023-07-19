import { BarChartOutlined, BranchesOutlined, NodeIndexOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import React from 'react';
import Tag from 'antd/lib/tag';
import packageJSON from '../../../package.json';
import * as Tags from './styled';

interface Props {
  selected: 'screens' | 'tours' | 'user-management' | 'analytics' | 'settings';
}

export default function SidePanel(props: Props): JSX.Element {
  return (
    <Tags.Con>
      <Tags.ConNav>
        <Tags.ConNavBtn className={props.selected === 'tours' ? 'selected' : ''} to="/tours">
          <NodeIndexOutlined />
          <p>Tours</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn className={props.selected === 'user-management' ? 'selected' : ''} to="#">
          <UsergroupAddOutlined />
          <p>User management</p>
        </Tags.ConNavBtn>
      </Tags.ConNav>
      <Tags.Footer style={{ marginBottom: '1.8rem' }}>
        <Tags.FooterItem className={`footerItem ${props.selected === 'settings' ? 'selected' : ''}`}>
          <p style={{ fontSize: '0.85rem', color: 'gray' }}>v{packageJSON.version}</p>
        </Tags.FooterItem>
      </Tags.Footer>
    </Tags.Con>
  );
}

// <Tags.ConLogo style={{ marginTop: '1.8rem' }}>
// <Tags.ConLogoImg src={FableLogo} alt="Fable logo" />
// </Tags.ConLogo>
