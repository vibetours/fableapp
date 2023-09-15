import React from 'react';
import { ChromeOutlined } from '@ant-design/icons';
import * as Tags from './styled';
import Browser1 from '../../assets/tour/browser-1.png';
import Browser3 from '../../assets/tour/browser-3.png';
import ControlPill from '../../assets/tour/control-pill.png';
import Button from '../button';

interface IProps {
  extensionInstalled: boolean;
}

function EmptyTourState({ extensionInstalled }: IProps): JSX.Element {
  return (
    <Tags.EmptyToursContainer>
      {!extensionInstalled && (
        <Button
          onClick={() => {
            window.open('https://chrome.google.com/webstore/detail/fable/ekmabenadlgfkjplmpldkjkhiikobaoc', '_blank');
          }}
          icon={<ChromeOutlined />}
          iconPlacement="left"
          size="large"
        >
          Download Fable's Chrome Extension
        </Button>
      )}

      <Tags.HeaderMsgCon>
        <h1>Hey 👋, looks like you haven't created a tour yet</h1>
        <p>You can create an interactive tour of your product in just 3 steps</p>
      </Tags.HeaderMsgCon>
      <Tags.CardWrapper>

        <Tags.EmptyStateCardCon>
          <Tags.CardIdx>1</Tags.CardIdx>
          <Tags.CardMsgCon>
            <h2>Open your product's webpage in chrome</h2>
            <p>If your product's webpage gets loaded in browser, be assured we can create an interactive demo.</p>
          </Tags.CardMsgCon>
          <Tags.CardImg src={Browser1} />
        </Tags.EmptyStateCardCon>

        <Tags.EmptyStateCardCon>
          <Tags.CardIdx>2</Tags.CardIdx>
          <Tags.CardMsgCon>
            <h2>Click on “Start Recording“ in Fable extension</h2>
            <p>
              Tap “Fable” extension & click on “Start Recording“. Click through your product to create the tour. Don't worry, it's not a video recording, if you've made a mistake you can edit every aspect of your tour.
            </p>
          </Tags.CardMsgCon>
          <Tags.CardImg src={Browser3} />
        </Tags.EmptyStateCardCon>

        <Tags.EmptyStateCardCon>
          <Tags.CardIdx>3</Tags.CardIdx>
          <Tags.CardMsgCon>
            <h2>Click on "Stop Recording" once you are done</h2>
            <p>Once you think you are done, click on "Stop Recording" from the control pill or from the extension menu.</p>
          </Tags.CardMsgCon>
          <Tags.CardImg src={ControlPill} />
        </Tags.EmptyStateCardCon>

      </Tags.CardWrapper>
    </Tags.EmptyToursContainer>
  );
}

export default EmptyTourState;
