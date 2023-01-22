import React, { MouseEventHandler } from 'react';
import Button, { ButtonType } from 'antd/lib/button';
import { PlusOutlined } from '@ant-design/icons';
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

  let iconEl;
  if (props.icon === 'plus') iconEl = <PlusOutlined />;

  return (
    <Button
      onClick={props.onClick}
      type={props.type}
      icon={iconEl}
      size="large"
    >
      {props.children}
    </Button>
  );
}

/*

      style={{
        fontWeight: '600',
        border: '1px solid #16023E',
        display: 'flex',
        alignItems: 'center',
        alignSelf: 'center',
      }}

 */
