import React from 'react';
import { Progress } from 'antd';
import { getUserGuideCompletionProgress, getUserGuideCompletionProgressInModules } from '../../user-guides/utils';
import * as Tags from './styled';

interface Props {
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  selected: boolean;
}

export default function UserGuideProgress(props: Props): JSX.Element {
  return (
    <Tags.UserGuideProgressCon selected={props.selected} onClick={props.onClick}>
      <ProgressCircle size={40} />
    </Tags.UserGuideProgressCon>
  );
}

interface ProgressCircleProps {
  size: number;
}

export function ProgressCircle(props: ProgressCircleProps): JSX.Element {
  const { completedModules, totalmodules } = getUserGuideCompletionProgressInModules();
  const remainingSteps = totalmodules - completedModules;

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: ' 0 auto' }}
    >
      <Progress
        type="circle"
        percent={(completedModules / totalmodules) * 100}
        size={props.size}
        strokeWidth={10}
        format={() => `${completedModules}`}
      />
      <div>
        <div style={{
          fontWeight: 700,
        }}
        >
          User Guide
        </div>
        <div
          style={{
            fontSize: '0.8rem',
            color: '#6a6a6a'
          }}
        >
          {remainingSteps > 0 ? `${remainingSteps} remaining modules(s)` : 'All modules completed!'}
        </div>
      </div>
    </div>
  );
}
