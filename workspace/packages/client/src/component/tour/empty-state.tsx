import React, { Suspense, lazy } from 'react';
import { OnboardingTourForPrev, RespUser } from '@fable/common/dist/api-contract';
import * as Tags from './styled';
import OnboardingDemos from './onboarding-demos';
import { StepContainer } from '../ext-download';
import UseCases from '../homepage/use-case/use-cases';

interface IProps {
  principal: RespUser | null;
  defaultTours: OnboardingTourForPrev[];
  extensionInstalled: boolean;
  isAtleastOneTourPublished: boolean;
  isAtleastOneDemoCreated: boolean;
  useCases?: string[]
}

const LottiePlayer = lazy(() => import('@lottiefiles/react-lottie-player').then(({ Player }) => ({
  default: Player
})));

function EmptyTourState({
  isAtleastOneDemoCreated,
  isAtleastOneTourPublished,
  principal,
  defaultTours: tours,
  extensionInstalled,
  useCases
}: IProps): JSX.Element {
  return (
    <Tags.EmptyToursContainer>
      <StepContainer
        extensionInstalled={extensionInstalled}
        isAtleastOneTourPublished={isAtleastOneTourPublished}
        isAtleastOneDemoCreated={isAtleastOneDemoCreated}
      />
      <div className="quilly-annoucement">
        <Suspense fallback={null}>
          <LottiePlayer
            style={{ height: '180px' }}
            src="./quilly.json"
            autoplay
            loop
          />
        </Suspense>
        <div>
          <p className="typ-h1">
            Meet Quilly, your AI Demo Copilot!
          </p>
          <div className="typ-reg">
            With Quilly, you can:
            <ul style={{ margin: 0 }}>
              <li>Generate appropriate demo content based on prompts</li>
              <li>Use different languages in the demo content</li>
              <li>Generate themes based on your product's branding</li>
            </ul>
            And many more. Give it a try & you'll know why our customers are raving!
          </div>
        </div>
      </div>
      <div className="example-demo-container">
        <div className="typ-h1" style={{ marginBottom: '0.5rem' }}>
          With Fable, you can create interactive demos like the one below.
        </div>
        <div className="typ-reg">
          It is an example of a product called Chargebee which is a subscription platform.
        </div>
        <iframe
          style={{ border: 'none' }}
          width="100%"
          height="500px"
          src="https://app.sharefable.com/embed/demo/chargebee-reporting-de-seutor1yh2mz867f"
          allowFullScreen
          title="example demo"
        />
      </div>
      <UseCases />

    </Tags.EmptyToursContainer>
  );
}

export default EmptyTourState;
