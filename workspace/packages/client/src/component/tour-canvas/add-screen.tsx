import React from 'react';
import { P_RespScreen } from '../../entity-processor';
import * as Tags from './styled';

type AddScreenProps = {
    screens: P_RespScreen[];
  };

function AddScreen({ screens }: AddScreenProps) {
  return (
    <Tags.SelectScreenContainer>
      <button>Select a screen in this flow</button>
      <Tags.ScreensContainer>
        {screens.length > 0 && (
        <div>
          <h2>Select a screen</h2>
          <Tags.ScreenSlider>
            {screens.map((screen, idx) => (
              <Tags.Screen key={idx}>
                <img src={screen.thumbnailUri.href} alt={screen.displayName} />
                <p>{screen.displayName}</p>
              </Tags.Screen>
            ))}
          </Tags.ScreenSlider>
        </div>
        )}
      </Tags.ScreensContainer>
    </Tags.SelectScreenContainer>
  );
}

export default AddScreen;
