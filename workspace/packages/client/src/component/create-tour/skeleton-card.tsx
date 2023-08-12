import React from 'react';
import { Skeleton } from 'antd';
import * as Tags from './styled';

interface IProps {
  progress?: number;
}

export default function SkeletonCard(props: IProps) {
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
      {props.progress !== undefined && (
        <div>
          <div style={{
            background: '#7567ff',
            width: `${props.progress!}%`,
            borderRadius: '4px',
            height: '6px',
            transition: 'width 0.2s ease-out'
          }}
          />
        </div>
      )}
    </Tags.CardCon>
  );
}
