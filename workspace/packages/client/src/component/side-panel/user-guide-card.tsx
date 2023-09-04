import React from 'react';
import { CheckCircleOutlined, CloseOutlined, InfoCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import * as Tags from './styled';
import { LocalStoreUserGuideProps } from '../../user-guides/utils';
import { GuideStatus } from './user-guide-details';

interface Props {
  type: GuideStatus;
  guide: LocalStoreUserGuideProps;
  resetStatus?: (guideId: string, type: GuideStatus) => void
}

export default function UserGuideCard(props: Props): JSX.Element {
  let icon: JSX.Element = <CheckCircleOutlined style={{ color: 'green' }} />;

  switch (props.type) {
    case 'completed':
      icon = <CheckCircleOutlined style={{ color: 'green' }} />;
      break;

    case 'remaining':
      icon = <QuestionCircleOutlined />;
      break;

    case 'skipped':
      icon = <InfoCircleOutlined />;
      break;

    default:
      break;
  }

  return (
    <Tags.UserGuideCard>
      {icon}
      {props.guide.name}
      {props.type !== 'remaining' && (
        <Tooltip title="Mark as undone">
          <CloseOutlined
            style={{ marginLeft: 'auto', cursor: 'pointer' }}
            onClick={() => {
              props.resetStatus!(props.guide.id, props.type);
            }}
          />
        </Tooltip>
      )}
    </Tags.UserGuideCard>
  );
}
