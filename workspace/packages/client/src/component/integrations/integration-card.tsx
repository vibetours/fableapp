import React from 'react';
import { RespLinkedApps } from '@fable/common/dist/api-contract';
import * as Tags from './styled';

interface Props {
  appConfig: RespLinkedApps;
  onClick: () => void;
}

const Desc = {
  hubspot: (
    <>
      <p>
        Fable seamlessly integrates with various modules of HubSpot.
        Fable supports the following operations:
      </p>
      <ul>
        <li>Syncs <em>contact</em> information with HubSpot</li>
        <li>
          Makes entries in the <em>contact activity timeline</em> about:
          <ul>
            <li>CTA clicks of each demo</li>
            <li>Aggregated metrics of all demos</li>
          </ul>
        </li>
        <li>Adds <em>custom contact properties</em> for reporting and analytics of demos</li>
        <li>Adds contact group called <em>Fable Demo</em> to show a detailed overview of all actions performed by the contact</li>
        <li>Creates a drill-down called Fable drill-down which shows the top demos engaged by the contact</li>
      </ul>
    </>
  ),
  'fable-webhook': (
    <>
      <p>
        Fable helps you configure your webhooks here to receive data as and when an event happens in a demo.
        Fable sends the following event data to a webhook:
      </p>
      <ul>
        <li>When a lead submits a form</li>
        <li>When a lead information is passed to Fable</li>
      </ul>
      <p>
        If you need any other custom event data posted to your webhook, please contact us via our in-app chat or write to us at&nbsp;
        <a
          href="mailto:support@sharefable.com?subject=Custom requirement for webhook"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          support@sharefable.com
        </a>
      </p>
    </>
  )
};

export default function IntegrationCard(props: Props): JSX.Element {
  return (
    <Tags.Con onClick={props.onClick}>
      <img src={props.appConfig.icon} alt="" height={24} />
      <div style={{ flex: '1 0 auto', width: 'calc(100% - 1rem - 24px - 1rem)' }}>
        <Tags.L1>
          <div className="header">
            {props.appConfig.name}
          </div>
          <div className="mini">
            {props.appConfig.connected && (
              <>
                <span style={{ color: '#4CAF50', fontSize: '1rem' }}>●</span>&nbsp;
                <span>Connected</span>
              </>
            )}
          </div>
        </Tags.L1>
        <Tags.L2>
          {(Desc as any)[props.appConfig.type]}
        </Tags.L2>
      </div>
    </Tags.Con>
  );
}
