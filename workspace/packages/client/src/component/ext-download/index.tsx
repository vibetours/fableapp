import React from 'react';
import { Collapse, Steps, Progress } from 'antd';
import Button from '../button';
import * as Tags from './styled';

interface IProps {
  extensionInstalled: boolean;
  isAtleastOneTourPublished: boolean;
}

function StepContainer({ extensionInstalled, isAtleastOneTourPublished }:
  { extensionInstalled: boolean, isAtleastOneTourPublished: boolean }): JSX.Element {
  return (
    <Tags.StepsCon className="empty">
      <Steps
        direction="vertical"
        current={-1}
        items={[
          {
            icon: extensionInstalled ? <Tags.CheckFilledIcon /> : <Tags.EmptyCircle />,
            title: 'Download the Fable extension',
            description: (
              <div>
                <ul style={{ marginBottom: '0.75rem' }}>
                  <li>Craft stunning demos that converts</li>
                  <li>Deliver flawless personalised demo</li>
                  <li>Product stories that resonates with your buyers & delivers instant value</li>
                </ul>
                <Button
                  onClick={() => {
                    window.open('https://chrome.google.com/webstore/detail/fable/ekmabenadlgfkjplmpldkjkhiikobaoc', '_blank');
                  }}
                  style={{
                    cursor: 'pointer'
                  }}
                >
                  Download Extension
                </Button>
              </div>
            ),
          },
          {
            icon: <Tags.CheckFilledIcon />,
            title: 'Create your first demo',
            description: (
              <div>Open your product website and click on Start Recording button in the extension.</div>
            ),
          },
          {
            icon: isAtleastOneTourPublished ? <Tags.CheckFilledIcon />
              : <Tags.EmptyCircle />,
            title: 'Embed a demo on your website',
            description: (
              <div> Click on share/ embed tour button avialable in menu </div>
            ),
          },
        ]}
      />
    </Tags.StepsCon>
  );
}

function shouldShowSetupGuide(
  extensionInstalled: boolean,
  isAtleastOneTourPublished: boolean
): boolean {
  return extensionInstalled && isAtleastOneTourPublished;
}

export default function ExtDownloadRemainder({ extensionInstalled, isAtleastOneTourPublished }: IProps): JSX.Element {
  const setupGuideVisible = shouldShowSetupGuide(extensionInstalled, isAtleastOneTourPublished);
  return (
    <Tags.Container setupGuideVisible={setupGuideVisible}>
      {(setupGuideVisible)
        ? <Collapse
            expandIcon={() => null}
            items={[{
              key: '1',
              label: (
                <Tags.SetupGuideCon>
                  <p>Setup Guide</p>
                  <Progress
                    percent={100}
                    format={(percent) => `${percent}%`}
                    strokeLinecap="round"
                    strokeColor="#7567FF"
                  />
                </Tags.SetupGuideCon>),
              children: <StepContainer
                extensionInstalled={extensionInstalled}
                isAtleastOneTourPublished={isAtleastOneTourPublished}
              />
            }]}
        />
        : <StepContainer
            extensionInstalled={extensionInstalled}
            isAtleastOneTourPublished={isAtleastOneTourPublished}
        />}
    </Tags.Container>
  );
}
