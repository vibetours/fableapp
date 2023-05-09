import React from 'react';
import * as Tags from './styled';

interface Props {
  title: string;
  active?: boolean;
  onClick?: () => void;
}

export default function TabItem({ title, active, onClick }: Props) {
  return (
    <Tags.TabItem onClick={onClick}>
      <Tags.TabTitle active={active}>
        {title}
        <Tags.TabActiveHighlight active={active} />
      </Tags.TabTitle>
    </Tags.TabItem>
  );
}
