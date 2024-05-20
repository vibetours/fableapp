import React from 'react';
import { Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import * as GTags from '../../common-styled';
import Button from '../button';
import { P_RespSubscription } from '../../entity-processor';

const { confirm } = Modal;

interface Props {
    showUpgradePlanModal: boolean;
    setShowUpgradePlanModal: (upgrade: boolean)=>void;
    subs: P_RespSubscription | null;
}

function UpgradeModal(props: Props) : JSX.Element {
  const navigate = useNavigate();

  const closeModal = () : void => {
    props.setShowUpgradePlanModal(false);
  };

  return (
    <div>
      <GTags.BorderedModal
        style={{ height: '10px' }}
        open={props.showUpgradePlanModal}
        onOk={closeModal}
        onCancel={closeModal}
        footer={(
          <div className="button-two-col-cont">
            <Button
              type="submit"
              style={{ flex: 1 }}
              onClick={() => {
                navigate('/billing');
              }}
            >
              Upgrade
            </Button>
          </div>
      )}
      >
        <div className="typ-h1">Upgrade to use this feature</div>
        {props.subs && (
          <>
            <p
              className="typ-reg"
              style={{
                marginBlockStart: '1rem',
                marginBlockEnd: '0.5rem'
              }}
            >
              You are currently on <em>{props.subs.paymentPlan}-{props.subs.paymentInterval}</em> plan.
            </p>
          </>
        )}
      </GTags.BorderedModal>
    </div>
  );
}

export default UpgradeModal;
