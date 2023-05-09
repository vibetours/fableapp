import React from 'react';
import { Skeleton } from 'antd';
import * as Tags from './styled';

export default function SkeletonCard() {
  return (
    <Tags.CardCon>
      <Skeleton.Node
        active
        style={{
          width: '100%',
          borderRadius: '4px',
          height: '7rem'
        }}
      >
        {' '}
      </Skeleton.Node>
      <Tags.TitleCon>
        <Skeleton.Avatar active style={{ width: '1rem', height: '1rem' }} />
        <Skeleton.Node
          active
          style={{
            height: '1rem',
          }}
        >
          {' '}
        </Skeleton.Node>
      </Tags.TitleCon>
      <Skeleton.Node
        active
        style={{
          height: '1rem',
        }}
      >
        {' '}
      </Skeleton.Node>
      <Tags.TimestampCon>
        <Skeleton.Node
          active
          style={{
            height: '1rem',
          }}
        >
          {' '}
        </Skeleton.Node>
        <Skeleton.Avatar active style={{ width: '1rem', height: '1rem' }} />
      </Tags.TimestampCon>
    </Tags.CardCon>
  );
}
