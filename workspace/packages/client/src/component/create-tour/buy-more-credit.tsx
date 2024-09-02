import React from 'react';
import { LoadingOutlined, WalletFilled } from '@ant-design/icons';
import Button from '../button';

function BuyMoreCredit({
  currentCredit,
  isBuyMoreCreditInProcess,
  buyMoreCredit
}:
{
  currentCredit: number;
  isBuyMoreCreditInProcess: boolean,
  buyMoreCredit: ()=> void
}): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
      }}
    >
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
