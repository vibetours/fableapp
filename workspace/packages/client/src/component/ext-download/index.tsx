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
            icon: extensionInstalled ? <Tags.CheckFilledIcon style={{ color: '#9E9E9E' }} /> : <Tags.EmptyCircle style={{ color: '#9E9E9E' }} />,
            title: 'Download the Fable extension',
            description: (
              <div style={{ lineHeight: '1.1rem' }}>
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
            icon: <Tags.CheckFilledIcon style={{ color: '#9E9E9E' }} />,
            title: 'Create your first demo',
            description: (
              <div style={{ lineHeight: '1.1rem' }}>Open your product website and click on Start Recording button in the extension.</div>
            ),
          },
          {
            icon: isAtleastOneTourPublished ? <Tags.CheckFilledIcon style={{ color: '#9E9E9E' }} />
              : <Tags.EmptyCircle style={{ color: '#9E9E9E' }} />,
            title: 'Embed a demo on your website',
            description: (
              <div style={{ lineHeight: '1.1rem' }}> Click on share/embed demo button avialable in menu </div>
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
            style={{
              border: 'none',
              background: '#f5f5f5'
            }}
            expandIcon={() => null}
            items={[{
              key: '1',
              label: (
                <Tags.SetupGuideCon>
                  <p><Tags.CheckFilledIcon style={{ color: '#9E9E9E' }} />&nbsp;&nbsp;Setup Guide</p>
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
