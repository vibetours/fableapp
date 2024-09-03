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
  const { completedModules, totalmodules } = getUserGuideCompletionProgressInModules();
  return (
    <Tags.UserGuideProgressCon selected={props.selected} onClick={props.onClick}>
      <ProgressCircle
        totalmodules={totalmodules}
        completedModules={completedModules}
        progressCircleSize={14}
      />
    </Tags.UserGuideProgressCon>
  );
}

// TODO[now] delete this
function UserGuideProgressCircle(): JSX.Element {
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
      <div />
    </div>
  );
}
