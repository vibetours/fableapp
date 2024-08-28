import React from 'react';
import Button from '../button';

function BuyMoreCredit({
  isBuyMoreCreditInProcess,
  buyMoreCredit
}:
{
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
      <span>Your credit for Demo Copilot is over</span>
      <Button
        type="submit"
        style={{
          backgroundColor: '#fedf64',
          color: 'black',
        }}
        onClick={buyMoreCredit}
        disabled={isBuyMoreCreditInProcess}
      >
        Buy more credit
      </Button>
    </div>
  );
}

export default BuyMoreCredit;
