import React, { MouseEventHandler } from 'react';
import Button, { ButtonType } from 'antd/lib/button';
import plusOutlined from '../../assets/plus-outlined.svg';

interface IProps {
  icon?: 'plus';
  children: React.ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement> & MouseEventHandler<HTMLAnchorElement>;
  type?: ButtonType;
}

export default function Btn(props: IProps) {
  let icon;
  if (props.icon === 'plus') {
    icon = plusOutlined;
  }
  return (
    <Button
      onClick={props.onClick}
      type="link"
      icon={
        icon && (
          <img
            src={icon}
            alt=""
            style={{
              height: '14px',
              width: '14px',
              marginRight: '0.5rem',
            }}
          />
        )
      }
      size="large"
      style={{
        fontWeight: '600',
        border: '1px solid #16023E',
        display: 'flex',
        alignItems: 'center',
        alignSelf: 'center',
      }}
    >
      {props.children}
    </Button>
  );
}
