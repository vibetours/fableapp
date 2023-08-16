import React from 'react';
import * as Tags from './styled';
import Browser1 from '../../assets/tour/browser-1.png';
import Browser2 from '../../assets/tour/browser-2.png';
import Browser3 from '../../assets/tour/browser-3.png';

function EmptyTourState(): JSX.Element {
  return (
    <Tags.EmptyToursContainer>
      <Tags.HeaderMsgCon>
        <h1>No Tours Created</h1>
        <p>Seems like you haven’t recorded any screens yet</p>
      </Tags.HeaderMsgCon>
      <Tags.CardWrapper>

        <Tags.EmptyStateCardCon>
          <Tags.CardIdx>1</Tags.CardIdx>
          <Tags.CardMsgCon>
            <h2>Go to the webpage</h2>
            <p>Go to the webpage you want to record</p>
          </Tags.CardMsgCon>
          <Tags.CardImg src={Browser1} />
        </Tags.EmptyStateCardCon>

        <Tags.EmptyStateCardCon>
          <Tags.CardIdx>2</Tags.CardIdx>
          <Tags.CardMsgCon>
            <h2>Pin the plugin</h2>
            <p>Pin the plugin for easy access</p>
          </Tags.CardMsgCon>
          <Tags.CardImg src={Browser2} />
        </Tags.EmptyStateCardCon>

        <Tags.EmptyStateCardCon>
          <Tags.CardIdx>3</Tags.CardIdx>
          <Tags.CardMsgCon>
            <h2>Tap “Fable” extension</h2>
            <p>Click on Fable extension from your browser plugin toolbar and click “Save screen”</p>
          </Tags.CardMsgCon>
          <Tags.CardImg src={Browser3} />
        </Tags.EmptyStateCardCon>
      </Tags.CardWrapper>
    </Tags.EmptyToursContainer>
  );
}

export default EmptyTourState;
