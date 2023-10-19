import React from 'react';
import { getUserGuideCompletionProgressInModules } from '../../user-guides/utils';
import * as Tags from './styled';
import openBookIcons from '../../assets/icons/open-book.svg';
import { ProgressCircle } from '../progress-circle';

interface Props {
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  selected: boolean;
}

export default function UserGuideProgress(props: Props): JSX.Element {
  return (
    <Tags.UserGuideProgressCon selected={props.selected} onClick={props.onClick}>
      <UserGuideProgressCircle />
    </Tags.UserGuideProgressCon>
  );
}

function UserGuideProgressCircle(): JSX.Element {
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
            Learn how to use Fable
          </div>
        </div>
      </div>
      <div>
        <ProgressCircle
          totalmodules={totalmodules}
          completedModules={completedModules}
          progressCircleSize={28}
        />
      </div>
    </div>
  );
}
