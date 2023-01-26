import React from 'react';
import * as Tags from './styled';
import FableLogo from '../../assets/side_panel/fableLogo.svg';
import iconSettings from '../../assets/side_panel/IconSettings.svg';
import allScreensIcon from '../../assets/all-screens-icon.svg';
import allToursIcon from '../../assets/all-tours-icon.svg';
import userManageIcon from '../../assets/user-manage-icon.svg';
import analyticsIcon from '../../assets/analytics-icon.svg';

interface Props {
  selected: 'screens' | 'tours' | 'user-management' | 'analytics' | 'settings';
}

export default function SidePanel(props: Props): JSX.Element {
  return (
    <Tags.Con>
      <Tags.ConLogo style={{ marginTop: '1.8rem' }}>
        <Tags.ConLogoImg src={FableLogo} alt="Fable logo" />
      </Tags.ConLogo>
      <Tags.ConNav>
        <Tags.ConNavBtn className={props.selected === 'screens' ? 'selected' : ''} to="/screens">
          <img src={allScreensIcon} alt="All screens icon" />
          <p>Screens</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn className={props.selected === 'tours' ? 'selected' : ''} to="/tours">
          <img src={allToursIcon} alt="All tours icon" />
          <p>Tours</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn className={props.selected === 'user-management' ? 'selected' : ''} to="/404">
          <img src={userManageIcon} alt="User management icon" />
          <p>User management</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn className={props.selected === 'analytics' ? 'selected' : ''} to="/404">
          <img src={analyticsIcon} alt="Analytics icon" />
          <p>Analytics</p>
        </Tags.ConNavBtn>
      </Tags.ConNav>
      <Tags.Footer style={{ marginBottom: '1.8rem' }}>
        <Tags.FooterItem className={`footerItem ${props.selected === 'settings' ? 'selected' : ''}`}>
          <Tags.FooterItemProfileIcon src={iconSettings} alt="illustration setting" />
          <p>Settings</p>
        </Tags.FooterItem>
      </Tags.Footer>
    </Tags.Con>
  );
}
