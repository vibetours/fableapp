import React, { MouseEventHandler } from 'react';
import Button, { ButtonType } from 'antd/lib/button';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import plusOutlined from '../../assets/plus-outlined.svg';

interface IProps {
  icon?: 'plus' | 'edit';
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
  else if (props.icon === 'edit') iconEl = <EditOutlined />;

  return (
    <Button
      onClick={props.onClick}
      type={props.type}
      icon={iconEl}
      size="middle"
      style={{
        margin: '0 1rem '
      }}
    >
      {props.children}
    </Button>
  );
}
