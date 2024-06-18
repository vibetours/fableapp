import { StarFilled } from '@ant-design/icons';
import React, { useState } from 'react';
import { P_RespSubscription } from '../../entity-processor';
import Button from '../button';
import UpgradeModal from './upgrade-modal';

interface Props {
  scaleDown?: boolean;
  subs: P_RespSubscription | null;
  isInBeta?: boolean;
}

function Upgrade({ scaleDown, subs, isInBeta }: Props): JSX.Element {
  const [showUpgradePlanModal, setShowUpgradePlanModal] = useState(false);
  return (
    <>
      <div
        className="upgrade-con"
        style={{
          transform: scaleDown ? 'scale(0.9) translate(-50%, -50%)' : '',
          left: scaleDown ? '30%' : '49%',
        }}
      >
        <Button
          size="small"
          style={{
            background: '#fedf64',
            color: 'black',
          }}
          onClick={() => {
            setShowUpgradePlanModal(true);
          }}
          iconPlacement="left"
          icon={<StarFilled style={{
            color: '#7567ff'
          }}
          />}
        >{isInBeta ? 'In Beta' : 'Upgrade'}
        </Button>
      </div>
      <UpgradeModal
        showUpgradePlanModal={showUpgradePlanModal}
        setShowUpgradePlanModal={setShowUpgradePlanModal}
        subs={subs}
        isInBeta={isInBeta}
      />
    </>
  );
}
export default Upgrade;
