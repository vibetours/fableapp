import { Button as AntButton } from 'antd/lib';
import { RightOutlined, BarsOutlined, CloseOutlined } from '@ant-design/icons';
import Dropdown from 'antd/lib/dropdown/dropdown';
import React, { ReactElement } from 'react';
import { CreateJourneyData, ITourDataOpts } from '@fable/common/dist/types';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import { getColorContrast, isBlankString } from '../../utils';

interface Props {
    tourJourney: CreateJourneyData;
    isJourneyMenuOpen: boolean;
    navigateToTour: (main: string)=> void;
    updateJourneyMenu: (isMenuOpen: boolean)=> void;
    navigateToCta: ()=> void;
    tourOpts: ITourDataOpts;
    currentFlowMain: string;
}

const getMenu = (
  journey: CreateJourneyData,
  navigateToTour: (main: string)=> void,
  navigateToCta: ()=> void,
  tourOpts: ITourDataOpts,
  currentFlowMain: string
) : ReactElement => (
  <Tags.JourneyCon>
    <Tags.FLowTitle>
      {journey.title}
    </Tags.FLowTitle>
    <div>
      {journey.flows.map((flow) => (!isBlankString(flow.main)
        ? (
          <Tags.FLowItemCon
            key={flow.header1}
            onClick={() => { navigateToTour(flow.main); }}
            isCurrentFlow={flow.main === currentFlowMain}
          >
            <div>
              <Tags.FlowHeader1> {flow.header1} </Tags.FlowHeader1>
              <Tags.FlowHeader2>{flow.header2}</Tags.FlowHeader2>
            </div>
            <div style={{ position: 'absolute', bottom: '16px', right: '16px' }}>
              <RightOutlined style={{ fontSize: 11, color: '#747474' }} />
            </div>
          </Tags.FLowItemCon>
        )
        : null))}
    </div>
    {journey.cta && (
      <div style={{ margin: '24px 16px 0 16px' }}>
        <GTags.CTABtn
          size={journey.cta.size}
          onClick={navigateToCta}
          style={{ width: '100%' }}
          color={tourOpts.primaryColor}
          borderRadius={tourOpts.borderRadius}
        >
          {journey.cta.text}
        </GTags.CTABtn>
      </div>
    )}
  </Tags.JourneyCon>
);

function JourneyMenu(props: Props): JSX.Element {
  return (
    <Tags.DropdownCon positioning={props.tourJourney.positioning}>
      <Dropdown
        open={props.isJourneyMenuOpen}
        dropdownRender={() => getMenu(props.tourJourney!, props.navigateToTour, props.navigateToCta, props.tourOpts, props.currentFlowMain)}
        trigger={['click']}
        onOpenChange={(e) => { props.updateJourneyMenu(e); }}
      >
        {props.isJourneyMenuOpen ? (
          <Tags.IndexButton
            type="primary"
            shape="circle"
            color={props.tourOpts.primaryColor}
            applywidth="true"
            icon={<CloseOutlined />}
          />
        ) : (
          <Tags.IndexButton
            color={props.tourOpts.primaryColor}
            type="primary"
            applywidth="false"
          >
            {props.tourJourney.title}
            <BarsOutlined />
          </Tags.IndexButton>
        )}
      </Dropdown>
    </Tags.DropdownCon>
  );
}

export default JourneyMenu;
