import React from 'react';
import { Progress } from 'antd';
import { getUserGuideCompletionProgressInModules } from '../../user-guides/utils';
import * as Tags from './styled';
import openBookIcons from '../../assets/icons/open-book.svg';
import CircleGreenFilledIcon from '../../assets/icons/circle-check-green.svg';

interface Props {
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  selected: boolean;
}

export default function UserGuideProgress(props: Props): JSX.Element {
  return (
    <Tags.UserGuideProgressCon selected={props.selected} onClick={props.onClick}>
      <ProgressCircle />
    </Tags.UserGuideProgressCon>
  );
}

function ProgressCircle(): JSX.Element {
  const { completedModules, totalmodules } = getUserGuideCompletionProgressInModules();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: ' 0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <img
          src={openBookIcons}
          alt="Guide icon"
        />
        <div>
          <div style={{ color: '#212121' }}>
            User guides
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6a6a6a' }}>
            Learn how to use features
          </div>
        </div>
      </div>
      {completedModules === totalmodules ? (
        <img
          src={CircleGreenFilledIcon}
          alt="Green checked outline"
          style={{ aspectRatio: '1/1', width: 28 }}
        />
      ) : (
        <Progress
          type="circle"
          percent={(completedModules / totalmodules) * 100}
          size={28}
          strokeWidth={14}
          format={() => `${completedModules}`}
          strokeColor="#2bd46f"
          trailColor="#D9D9D9"
          showInfo={false}
          strokeLinecap="square"
          style={{
            transform: 'scaleX(-1)',
          }}
        />
      )}
    </div>
  );
}
