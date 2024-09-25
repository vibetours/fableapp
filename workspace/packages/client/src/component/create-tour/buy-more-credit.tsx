import React, { useEffect } from 'react';
import { LoadingOutlined, WalletFilled } from '@ant-design/icons';
import { ReqSubscriptionInfo } from '@fable/common/dist/api-contract';
import api from '@fable/common/dist/api';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import Button from '../button';

declare const Chargebee: any;

function BuyMoreCredit({
  currentCredit,
  isBuyMoreCreditInProcess,
  checkCredit,
  showCreditInfo,
  onBuyMoreCreditClick
}:
{
  currentCredit: number;
  isBuyMoreCreditInProcess: boolean,
  checkCredit: ()=> void,
  showCreditInfo: boolean,
  onBuyMoreCreditClick: ()=> void,
}): JSX.Element {
  useEffect(() => {
    Chargebee.init({
      site: process.env.REACT_APP_CHARGEBEE_SITE,
    });
  }, []);

  const buyMoreCredit = (): void => {
    onBuyMoreCreditClick();
    const cbInstance = Chargebee.getInstance();
    cbInstance.openCheckout({
      hostedPage() {
        return api<ReqSubscriptionInfo | undefined, null>('/credittopupurl', {
          method: 'POST',
          auth: true
        });
      },
      loaded() { },
      error(e: Error) { raiseDeferredError(e); },
      close() { },
      success() {
        checkCredit();
      },
      step() { }
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
      }}
    >
      {showCreditInfo
      && (
      <div>
        <div>Your AI credit is not enough</div>
        <div style={{
          fontSize: '0.9rem',
        }}
        >
          Your current credit:&nbsp;
          <span style={{
            color: 'white',
            background: '#16023e',
            padding: '1px 6px',
            borderRadius: '6px'
          }}
          >
            {currentCredit} <WalletFilled />
          </span>
        </div>
      </div>
      )}
      <Button
        type="submit"
        style={{
          backgroundColor: '#fedf64',
          color: 'black',
        }}
        onClick={buyMoreCredit}
        disabled={isBuyMoreCreditInProcess}
        icon={isBuyMoreCreditInProcess ? <LoadingOutlined /> : null}
      >
        Buy more credit
      </Button>
    </div>
  );
}

export default BuyMoreCredit;
