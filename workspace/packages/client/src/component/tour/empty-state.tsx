import React, { useEffect, useState } from 'react';
import { ChromeOutlined } from '@ant-design/icons';
import { OnboardingTourForPrev, RespUser } from '@fable/common/dist/api-contract';
import { Skeleton, Progress } from 'antd';
import * as Tags from './styled';
import Browser1 from '../../assets/tour/browser-1.png';
import Browser3 from '../../assets/tour/browser-3.png';
import ControlPill from '../../assets/tour/control-pill.png';
import Button from '../button';
import OnboardingDemos from './onboarding-demos';

interface IProps {
  principal: RespUser | null;
  defaultTours: OnboardingTourForPrev[];
  extensionInstalled: boolean;
}

function EmptyTourState({
  principal,
  defaultTours: tours,
  extensionInstalled
}: IProps): JSX.Element {
  return (
    <Tags.EmptyToursContainer>
      <Tags.DefaultDemoCon>
        <OnboardingDemos layout="row" previewTours={tours} />
      </Tags.DefaultDemoCon>
      {!extensionInstalled && (
        <Button
          onClick={() => {
            window.open('https://chrome.google.com/webstore/detail/fable/ekmabenadlgfkjplmpldkjkhiikobaoc', '_blank');
          }}
          icon={<ChromeOutlined />}
          iconPlacement="left"
          size="large"
        >
          Install Fable's Chrome Extension
        </Button>
      )}
      <div>
        <div style={{ marginLeft: '60px' }}>
          <Tags.HeaderMsgCon>
            <h1>
              Hey {principal?.firstName || ''} 👋, you can create your first interactive demo as soon as you install Fable's
              Chrome Extension
            </h1>
            <p>You can create an interactive demo of your product in 3 easy steps</p>
          </Tags.HeaderMsgCon>
          <Tags.CardWrapper>

            <Tags.EmptyStateCardCon>
              <Tags.CardIdx>1</Tags.CardIdx>
              <Tags.CardMsgCon>
                <h2>Open your product in a new tab</h2>
                <p>Navigate to your product page where you want to start the interactive demo.</p>
              </Tags.CardMsgCon>
              <Tags.CardImg src={Browser1} />
            </Tags.EmptyStateCardCon>

            <Tags.EmptyStateCardCon>
              <Tags.CardIdx>2</Tags.CardIdx>
              <Tags.CardMsgCon>
                <h2>Click on 'Start Recording' in Fable's extension</h2>
                <p>
                  Tap on the Fable extension you installed and click on 'Start Recording'. Click through the product that
                  you want to show in the interactive demo and let Fable handle the rest.
                </p>
              </Tags.CardMsgCon>
              <Tags.CardImg src={Browser3} />
            </Tags.EmptyStateCardCon>

            <Tags.EmptyStateCardCon>
              <Tags.CardIdx>3</Tags.CardIdx>
              <Tags.CardMsgCon>
                <h2>Once you are done, click on 'Stop Recording'</h2>
                <p>
                  After you have carried out all the actions you want captured in the interactive demo, click on
                  'Stop Recording' or the ✅ that you see in the bottom right corner.
                </p>
              </Tags.CardMsgCon>
              <Tags.CardImg src={ControlPill} />
            </Tags.EmptyStateCardCon>

          </Tags.CardWrapper>
        </div>
      </div>
    </Tags.EmptyToursContainer>
  );
}

export default EmptyTourState;
