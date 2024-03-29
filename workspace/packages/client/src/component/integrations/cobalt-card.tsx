import React from 'react';
import { RespLinkedApps } from '@fable/common/dist/api-contract';
import * as Tags from './styled';

interface Props {
  cobaltApp: RespLinkedApps;
  onClick: () => void;
}

const Desc = {
  hubspot: (
    <>
      <p>
        Fable tightly integrates with various modues of Hubspot.
        Fable supports the following operation
      </p>
      <ul>
        <li>Syncs <em>Contact</em> information with Hubspot</li>
        <li>
          Makes entries in <em>contact activity timeline</em> about
          <ul>
            <li>CTA click</li>
            <li>Aggregated demo visit metrics</li>
          </ul>
        </li>
        <li>Adds <em>custom contact properties</em> for reporting</li>
        <li>Adds contact group <em>Fable Demo</em> and all custom contact properties</li>
        <li>Updates lead 360 data</li>
      </ul>
    </>
  )
};

export default function CobaltCard(props: Props): JSX.Element {
  return (
    <Tags.Con onClick={props.onClick}>
      <img src={props.cobaltApp.icon} alt="" height={24} />
      <div style={{ flex: '1 0 auto', width: 'calc(100% - 1rem - 24px - 1rem)' }}>
        <Tags.L1>
          <div className="header">
            {props.cobaltApp.name}
          </div>
          <div className="mini">
            {props.cobaltApp.connected && (
              <>
                <span style={{ color: '#4CAF50', fontSize: '1rem' }}>●</span>&nbsp;
                <span>Connected</span>
              </>
            )}
          </div>
        </Tags.L1>
        <Tags.L2>
          {(Desc as any)[props.cobaltApp.type]}
        </Tags.L2>
      </div>
    </Tags.Con>
  );
}
