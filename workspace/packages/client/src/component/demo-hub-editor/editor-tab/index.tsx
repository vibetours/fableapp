import React from 'react';
import styled from 'styled-components';
import { Tabs } from 'antd';
import GeneralSection from './general-section';
import SeeAllPageTab from './see-all-tab';
import QualificationTab from './qualification-tab';
import * as Tags from '../styled';
import CTASection from './cta-section';
import { useEditorCtx } from '../ctx';

const InfoBox = styled.div`
  padding: 0.5rem 1rem;

  p {
    margin: 0.5rem 0;
    padding: 0;
    margin-block-start: 0.5rem;
    margin-block-end: 0.5rem;
  }

  ul {
    margin-block-start: 0.5rem;
    margin-block-end: 0.5rem;
  }
`;

function EditorTab(): JSX.Element {
  const { setPreviewUrl, data } = useEditorCtx();

  return (
    <Tags.SidepanelCon>
      <GeneralSection />
      <CTASection />
      <br />
      <InfoBox
        className="typ-sm"
        style={{
          fontWeight: 500,
          opacity: 0.8
        }}
      >
        <p>
          Demo hub can host two types of pages.
        </p>
        <ul>
          <li style={{ marginBottom: '0.25rem' }}>Use <i>See all</i> page to list all your demos in one place.</li>
          <li>Use <i>Qualification</i> to qualify your buyers based on different criterias and deliver a personalized demo experience.</li>
        </ul>
        <p>
          You can configure both these pages in the following section.
        </p>
      </InfoBox>
      <br />
      <Tabs
        className="ht"
        centered
        type="card"
        defaultActiveKey="see-all-page"
        items={[
          {
            label: <span className="typ-reg">See All Page</span>,
            children: <SeeAllPageTab />,
            key: 'see-all-page',
          },
          {
            label: <span className="typ-reg">Qualification</span>,
            children: <QualificationTab />,
            key: 'qualification',
          },
        ]}
        onChange={e => {
          if (e === 'see-all-page') {
            setPreviewUrl(`seeall/${data.rid}?lp=true`);
          } else {
            setPreviewUrl(`q/${data.rid}?lp=true`);
          }
        }}
      />
    </Tags.SidepanelCon>
  );
}

export default EditorTab;
