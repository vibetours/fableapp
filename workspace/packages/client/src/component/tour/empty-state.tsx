import React from 'react';
import { OnboardingTourForPrev, RespUser } from '@fable/common/dist/api-contract';
import * as Tags from './styled';
import OnboardingDemos from './onboarding-demos';
import { StepContainer } from '../ext-download';

interface IProps {
  principal: RespUser | null;
  defaultTours: OnboardingTourForPrev[];
  extensionInstalled: boolean;
  isAtleastOneTourPublished: boolean;
  isAtleastOneDemoCreated: boolean;
}

function EmptyTourState({
  isAtleastOneDemoCreated,
  isAtleastOneTourPublished,
  principal,
  defaultTours: tours,
  extensionInstalled
}: IProps): JSX.Element {
  return (
    <Tags.EmptyToursContainer>
      <Tags.DefaultDemoCon>
        <OnboardingDemos layout="row" previewTours={tours} />
      </Tags.DefaultDemoCon>

      <StepContainer
        extensionInstalled={extensionInstalled}
        isAtleastOneTourPublished={isAtleastOneTourPublished}
        isAtleastOneDemoCreated={isAtleastOneDemoCreated}
      />
    </Tags.EmptyToursContainer>
  );
}

export default EmptyTourState;
