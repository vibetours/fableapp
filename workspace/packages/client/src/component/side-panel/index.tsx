import { BarChartOutlined, BranchesOutlined, CreditCardOutlined, NodeIndexOutlined, UsergroupAddOutlined, WalletFilled } from '@ant-design/icons';
import React from 'react';
import Tag from 'antd/lib/tag';
import packageJSON from '../../../package.json';
import * as Tags from './styled';
import { P_RespSubscription } from '../../entity-processor';

interface Props {
  selected: 'tours' | 'user-management' | 'billing' | 'settings';
  subs: P_RespSubscription | null;
}

export default function SidePanel(props: Props): JSX.Element {
  return (
    <Tags.Con>
      <Tags.ConNav>
        <Tags.ConNavBtn className={props.selected === 'tours' ? 'selected' : ''} to="/tours">
          <NodeIndexOutlined />
          <p>Tours</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn className={props.selected === 'user-management' ? 'selected' : ''} to="/users">
          <UsergroupAddOutlined />
          <p>User management</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn className={props.selected === 'billing' ? 'selected' : ''} to="/billing">
          <CreditCardOutlined />
          <p>Billing</p>
        </Tags.ConNavBtn>
      </Tags.ConNav>
      <Tags.Footer style={{ marginBottom: '1.8rem' }}>
        <Tags.FooterItem className={`footerItem ${props.selected === 'settings' ? 'selected' : ''}`}>
          <p style={{ fontSize: '0.85rem', color: '#747474' }}>
            {props.subs && (
              <>
                <WalletFilled />&nbsp;
                {props.subs.paymentPlan[0] + props.subs.paymentPlan.substring(1).toLowerCase()}
              </>
            )}
            <span style={{ fontSize: '0.85rem', color: '#BDBDBD' }}> - v{packageJSON.version}</span>
          </p>
        </Tags.FooterItem>
      </Tags.Footer>
    </Tags.Con>
  );
}
