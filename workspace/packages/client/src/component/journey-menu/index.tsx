import { ArrowRightOutlined, BarsOutlined, CloseOutlined } from '@ant-design/icons';
import Dropdown from 'antd/lib/dropdown/dropdown';
import React, { ReactElement } from 'react';
import { CreateJourneyData, ITourDataOpts } from '@fable/common/dist/types';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import { getColorContrast, isBlankString } from '../../utils';
import { FlowProgress } from '../../types';
import { ProgressCircle } from '../progress-circle';

interface Props {
    journey: CreateJourneyData;
    isJourneyMenuOpen: boolean;
    navigateToJourney: (main: string)=> void;
    updateJourneyMenu: (isMenuOpen: boolean)=> void;
    navigateToCta: ()=> void;
    tourOpts: ITourDataOpts;
    currentFlowMain: string;
    journeyProgress: FlowProgress[];
}

const getMenu = (
  journey: CreateJourneyData,
  navigateToJourney: (main: string)=> void,
  navigateToCta: ()=> void,
  tourOpts: ITourDataOpts,
  currentFlowMain: string,
  journeyProgress: FlowProgress[]
) : ReactElement => {
  const getFlowProgress = (main: string) : FlowProgress => {
    const currenFlowProgress = journeyProgress.find(
      (flow) => flow.main === main
    ) || { completedSteps: 0, totalSteps: 10, main };
    return currenFlowProgress;
  };

  return (
    <Tags.JourneyCon>
      <Tags.FLowTitle>
        {journey.title}
      </Tags.FLowTitle>
      <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
        {journey.flows.map((flow) => (!isBlankString(flow.main)
          ? (
            <Tags.FLowItemCon
              key={flow.header1}
              onClick={() => { navigateToJourney(flow.main); }}
              isCurrentFlow={flow.main === currentFlowMain}
            >
              <div style={{ width: '16px', height: '16px', position: 'absolute', top: '16px' }}>
                <ProgressCircle
                  totalmodules={getFlowProgress(flow.main).totalSteps}
                  completedModules={getFlowProgress(flow.main).completedSteps}
                  progressCircleSize={16}
                />
              </div>
              <div style={{ marginLeft: '32px' }}>
                <Tags.FlowHeader1> {flow.header1} </Tags.FlowHeader1>
                <Tags.FlowHeader2>{flow.header2}</Tags.FlowHeader2>
              </div>
              <div style={{ position: 'absolute', bottom: '16px', right: '16px' }}>
                <ArrowRightOutlined style={{ fontSize: 11, color: '#747474' }} />
              </div>
            </Tags.FLowItemCon>
          )
          : null))}
      </div>
      {journey.cta && journey.cta.navigateTo && (
      <div style={{ margin: '24px 16px 0 16px' }}>
        <GTags.CTABtn
          size={journey.cta.size}
          onClick={navigateToCta}
          style={{ width: '100%' }}
          color={journey.primaryColor}
          borderRadius={tourOpts.borderRadius}
        >
          {journey.cta.text}
        </GTags.CTABtn>
      </div>
      )}
    </Tags.JourneyCon>
  );
};

function JourneyMenu(props: Props): JSX.Element {
  const primaryColor = props.journey.primaryColor;
  return (
    <Tags.DropdownCon positioning={props.journey.positioning}>
      <Dropdown
        open={props.isJourneyMenuOpen}
        dropdownRender={() => getMenu(
          props.journey!,
          props.navigateToJourney,
          props.navigateToCta,
          props.tourOpts,
          props.currentFlowMain,
          props.journeyProgress
        )}
        trigger={['click']}
        onOpenChange={(e) => { props.updateJourneyMenu(e); }}
      >
        {props.isJourneyMenuOpen ? (
          <Tags.IndexButton
            type="primary"
            shape="circle"
            color={primaryColor}
            applywidth="true"
            icon={<CloseOutlined />}
          />
        ) : (
          <Tags.IndexButton
            color={primaryColor}
            type="primary"
            applywidth="false"
          >
            {props.journey.title}
            <BarsOutlined style={{ color: getColorContrast(primaryColor) === 'dark' ? 'fff' : '000' }} />
          </Tags.IndexButton>
        )}
      </Dropdown>
    </Tags.DropdownCon>
  );
}

export default JourneyMenu;
