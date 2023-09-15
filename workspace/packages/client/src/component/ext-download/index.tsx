import React from 'react';
import { CheckOutlined } from '@ant-design/icons';
import FableRoundedIcon from '../../assets/fable-rounded-icon.svg';
import Button from '../button';
import * as Tags from './styled';

interface IProps {
  extensionInstalled: boolean;
}

export default function ExtDownloadRemainder({ extensionInstalled }: IProps): JSX.Element {
  if (extensionInstalled) return <></>;

  return (
    <Tags.Con>
      <Tags.TitleCon>
        <Tags.FableLogo
          src={FableRoundedIcon}
          alt="Fable"
        />
        <Tags.Title>Download the Fable extension</Tags.Title>
      </Tags.TitleCon>
      <Tags.Features>
        <li><Tags.CheckOutlinedIcon />Craft stunning demos that converts</li>
        <li><Tags.CheckOutlinedIcon />Deliver flawless personalised dmeo</li>
        <li><Tags.CheckOutlinedIcon />Product stories that resonates with your buyers & delivers instant value</li>
      </Tags.Features>
      <Button
        onClick={() => {
          window.open('https://chrome.google.com/webstore/detail/fable/ekmabenadlgfkjplmpldkjkhiikobaoc', '_blank');
        }}
        style={{
          width: '100%'
        }}
      >
        Download Extension
      </Button>
    </Tags.Con>
  );
}
