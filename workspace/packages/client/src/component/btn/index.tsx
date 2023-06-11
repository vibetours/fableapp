import React, { CSSProperties, MouseEventHandler } from 'react';
import Button, { ButtonType } from 'antd/lib/button';
import { EditOutlined, PlusOutlined, PlusSquareFilled } from '@ant-design/icons';
import { SizeType } from 'antd/lib/config-provider/SizeContext';
import newScreenDark from '../../assets/new-screen-dark.svg';

interface IProps {
  icon?: 'plus' | 'edit' | 'new-screen';
  children?: React.ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement> & MouseEventHandler<HTMLAnchorElement>;
  type?: ButtonType;
  style?: CSSProperties;
  title?: string;
  size?: SizeType;
}

export default function Btn(props: IProps) {
  let iconEl;
  if (props.icon === 'plus') iconEl = <PlusSquareFilled />;
  else if (props.icon === 'edit') iconEl = <EditOutlined />;
  else if (props.icon === 'new-screen') iconEl = <img src={newScreenDark} alt="new screen" />;

  return (
    <Button
      title={props.title}
      onClick={props.onClick}
      type={props.type}
      icon={iconEl}
      size={props.size ? props.size : 'middle'}
      style={{
        margin: '0 1rem ',
        ...(props.style || {})
      }}
    >
      {props.children}
    </Button>
  );
}
