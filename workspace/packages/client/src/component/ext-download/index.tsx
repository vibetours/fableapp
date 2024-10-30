import React from 'react';
import { Collapse, Steps, Progress } from 'antd';
import { ChromeOutlined } from '@ant-design/icons';
import Button from '../button';
import * as Tags from './styled';
import SetupStep from '../homepage/setup-steps';
import Input from '../input';

interface IProps {
  extensionInstalled: boolean;
  isAtleastOneTourPublished: boolean;
  isAtleastOneDemoCreated: boolean;
}

export function StepContainer({
  extensionInstalled,
  isAtleastOneTourPublished,
  isAtleastOneDemoCreated
}: {
  extensionInstalled: boolean,
  isAtleastOneTourPublished: boolean,
  isAtleastOneDemoCreated: boolean
}): JSX.Element {
  if (isAtleastOneTourPublished) {
    return <></>;
  }
  return (

    <Tags.SetupSteps className="empty">
      <SetupStep
        index={1}
        isStepComplete={extensionInstalled}
        title="Download Fable’s Chrome Extension"
        description={(
          <div>
            This is a mandatory step for you to start creating amazing demos with Fable.
          </div>
        )}
        footer={extensionInstalled ? undefined : (
          <Button
            onClick={() => {
              window.open(
                'https://chrome.google.com/webstore/detail/fable/ekmabenadlgfkjplmpldkjkhiikobaoc',
                '_blank'
              );
            }}
            style={{
              width: '100%'
            }}
            size="medium"
            icon={<ChromeOutlined />}
            iconPlacement="left"
          >
            Install Extension
          </Button>
        )}
      />
      <SetupStep
        index={2}
        isStepComplete={isAtleastOneDemoCreated}
        title="Create your first demo"
        description={(
          <ul>
            <li>
              Go to your website/application that you want to create a demo of
            </li>
            {extensionInstalled && !isAtleastOneDemoCreated && (
              <Input
                label="Enter product url & press ↵ "
                containerStyle={{
                  margin: '1rem 0 1.5rem'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    let url = ((e.target as any).value);
                    url = url.trim().replace(/\s+/g, '');
                    if (!url) return;
                    if (!(url.startsWith('https://') || url.startsWith('http://'))) {
                      url = `https://${url}`;
                    }
                    window.open(url, '_blank')!.focus();
                  }
                }}
              />
            )}
            <li style={{ margin: '0.5rem 0' }}>Click on Fable's chrome extension icon to record a demo</li>
          </ul>
        )}
      />
      <SetupStep
        index={3}
        isStepComplete={isAtleastOneTourPublished}
        title="Embed/share your demo"
        description={(
          <ul>
            <li>After you have created the demo, click on publish</li>
            <li style={{ margin: '0.5rem 0' }}>You can then embed on your website or share this via URL</li>
          </ul>
        )}
      />
    </Tags.SetupSteps>
  );
}
