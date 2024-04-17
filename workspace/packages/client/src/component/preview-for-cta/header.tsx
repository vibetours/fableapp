import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import * as Tags from './styled';
import { SiteData } from '../../types';
import FableLogo from '../../assets/fable-logo-2.svg';
import { getColorContrast } from '../../utils';

interface Props {
  site: SiteData;
  captureConversion: () => void;
}

export default function Header(props: Props): JSX.Element {
  const [color, setColor] = useState('#fff');

  useEffect(() => {
    const bgColor = props.site.headerBg === 'auto' ? props.site.bg1 : props.site.headerBg;
    const textColor = getColorContrast(bgColor) === 'dark' ? '#fff' : '#000';
    setColor(textColor);
  }, [props.site]);

  return (
    <Tags.HeaderCon
      color={color}
      style={{
        backgroundColor: props.site.headerBg === 'auto' ? props.site.bg1 : props.site.headerBg,
        filter: `hue-rotate(${props.site.headerBg === 'auto' ? 45 : 0}deg)`,
        boxShadow: '0px 0px 2px -1px #424242',
        height: '60px'
      }}
    >
      <div
        className="lg-t"
        style={{
          filter: `hue-rotate(${props.site.headerBg === 'auto' ? -45 : 0}deg)`,
        }}
      >
        <a
          href={props.site.navLink || 'https://sharefable.com'}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          target="_blank"
          rel="noreferrer"
        >
          <img src={props.site.logo || FableLogo} alt="" height={35} />
        </a>
        <div className="typ-h2" style={{ fontWeight: 600, color }}>
          {props.site.title}
        </div>
      </div>
      {props.site.ctaText && (
        <a href={props.site.ctaLink} onClick={props.captureConversion}>
          <Button
            size="small"
            className="sec-btn"
            type="default"
            style={{
              padding: '0 0.8rem',
              height: '30px',
              borderRadius: '16px',
              backgroundColor: 'transparent',
            }}
          >
            {props.site.ctaText}
          </Button>
        </a>
      )}
    </Tags.HeaderCon>
  );
}
