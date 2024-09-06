import { Progress, Spin } from 'antd';
import React from 'react';
import { CheckCircleFilled } from '@ant-design/icons';
import * as Tags from './styled';

interface Props {
  totalSteps: number | null;
  completedSteps: number;
  title: string;
  progressInfo: string;
  showCircularLoader?: boolean;
}

function CreateTourProgress(props: Props): JSX.Element {
  return (
    <Tags.ProgressCon>
      {props.totalSteps && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', margin: '0 10px' }}>
            <span className="typ-reg">{props.title}</span>
            {props.progressInfo
              && <span className="typ-sm">[{props.completedSteps}/{props.totalSteps}] {props.progressInfo}</span>}
          </div>
          {
            props.showCircularLoader
              ? <div style={{ textAlign: 'start' }}><Spin /></div>
              : (
                <>
                  <Progress
                    strokeWidth={14}
                    strokeColor="#7567FF"
                    trailColor="#D9D9D9"
                    showInfo={false}
                    strokeLinecap="square"
                    percent={(props.completedSteps * 100) / props.totalSteps}
                    style={{ marginBottom: 0 }}
                  />
                  {props.completedSteps === props.totalSteps
                    && <CheckCircleFilled style={{ color: '#7567FF', fontSize: 15, marginLeft: '5px' }} />}
                </>)
          }
        </>
      )}
    </Tags.ProgressCon>
  );
}

export default CreateTourProgress;
