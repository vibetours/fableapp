import React from 'react';
import { MobileOutlined } from '@ant-design/icons';
import { Radio } from 'antd';
import { ReqTourPropUpdate, Responsiveness } from '@fable/common/dist/api-contract';
import * as Tags from './styled';
import { P_RespTour } from '../../entity-processor';
import { isTourResponsive } from '../../utils';
import FableButton from '../button';
import { OurLink, OurRadio } from '../../common-styled';

interface Props {
  showMobileResponsivenessDrawer: boolean;
  setShowMobileResponsivenessDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  selectedResponsivenessStrategy: Responsiveness;
  setSelectedResponsivenessStrategy: React.Dispatch<React.SetStateAction<Responsiveness>>;
  tour: P_RespTour;
  updateResponsiveness: (responsiveness: Responsiveness) => void;
}

export default function ResponsiveStrategyDrawer(props: Props): JSX.Element {
  return (
    <Tags.StyledDrawer
      title={(<><MobileOutlined /> &nbsp; Mobile Responsiveness Strategy</>)}
      open={props.showMobileResponsivenessDrawer}
      onClose={() => props.setShowMobileResponsivenessDrawer(false)}
      placement="left"
      width={600}
      className="typ-reg"
    >
      <Radio.Group
        value={props.selectedResponsivenessStrategy}
        onChange={e => {
          if (
            e.target.value === Responsiveness.NoResponsive
          && props.tour.responsive2 !== Responsiveness.NoResponsive
          ) {
            props.updateResponsiveness(Responsiveness.NoResponsive);
          }

          props.setSelectedResponsivenessStrategy(e.target.value);
        }}
      >
        <OurRadio value={Responsiveness.Responsive}>
          <p className="typ-h2">My app is responsive in Mobile</p>
          <p style={{ fontSize: '0.75rem' }}>
            Check this if your app adapts to Mobile and Desktop (different screen sizes) gracefully.
            App developer might be using media query to achieve this.
            <br />
            If you don't know if your app is responsive or not, you can check this guide for verification.
          </p>

          {props.selectedResponsivenessStrategy === Responsiveness.Responsive && (
          <>
            <p className="typ-reg">
              Responsiveness is a subjective choice and the implementation varies wildly. If your app is
              responsive on mobile devices, press the button below, Fable will manage your demo on mobile
              gracefully.
            </p>

            <FableButton
              onClick={() => props.updateResponsiveness(Responsiveness.Responsive)}
              disabled={isTourResponsive(props.tour)}
            >
              {isTourResponsive(props.tour)
                ? 'Your app is made responsive'
                : 'Make this Fable responsive for Mobile devices'}

            </FableButton>
            <p className="typ-reg">
              Don't worry you can always go back to non responsive mode later on.
            </p>

            {isTourResponsive(props.tour) && (
            <>
              <p className="typ-reg">
                All your screens are made responsive. You can visit each screen now and check
                if annotations are displayed properly in mobile.
              </p>

              <p className="typ-reg">
                If they are not (this might happen in case your app adapts to different layout
                for different devices), you can readjust the annotation for different devices.
              </p>

              <OurLink
                href={`/preview/demo/${props.tour.rid}?s=3`}
                target="_blank"
                rel="noreferrer"
              >
                Checkout how this demo would look on Mobile devices
              </OurLink>
            </>
            )}
          </>
          )}

        </OurRadio>

        <OurRadio value={Responsiveness.NoResponsive}>
          <p className="typ-h2">My app is NOT responsive in Mobile</p>
          {props.selectedResponsivenessStrategy === Responsiveness.NoResponsive && (
          <>
            <p className="typ-reg">
              If your app is not responsive on mobile devices, Fable still tries to provide
              a convienient experience when someone opens the demo on mobile
            </p>

            <p className="typ-reg" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MobileOutlined style={{ fontSize: '1.5rem' }} /> On portrait mode we show the following warning
            </p>

            <div style={{ marginLeft: '1.75rem', }}>
              <div style={{
                textAlign: 'center',
                backgroundColor: '#F5F5F5',
                padding: '1.5rem 2rem'
              }}
              >
                <p className="typ-reg">
                  This demo is best viewed on
                  Desktop or you can rotate your
                  screen for a better experience.
                </p>
                <OurLink>Continue to demo in this mode</OurLink>
              </div>
              <OurLink
                style={{
                  marginTop: '0.5rem',
                  display: 'block'
                }}
                href={`/preview/demo/${props.tour.rid}?s=3`}
                target="_blank"
                rel="noreferrer"
              >
                Checkout how this demo would look on Portrait mode
              </OurLink>
            </div>

            <p className="typ-reg" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: 0 }}>
              <MobileOutlined rotate={270} style={{ fontSize: '1.5rem' }} />
              On landscape mode we show a managed version of the demo
            </p>

            <div style={{ marginLeft: '1.75rem', }}>
              <OurLink
                href={`/preview/demo/${props.tour.rid}?s=4`}
                target="_blank"
                rel="noreferrer"
              >
                Checkout how this demo would look on Landscape mode
              </OurLink>
              <div style={{
                marginTop: '1rem',
                backgroundColor: '#F5F5F5',
                padding: '1.25rem'
              }}
              >
                <p className="typ-reg" style={{ margin: 0, padding: 0 }}>
                  If your app is not responsive, but renders on mobile (via js)
                  you can use our extension to record mobile version of your
                  app and embed different demos based on device type
                </p>
              </div>
            </div>
          </>
          )}
        </OurRadio>
      </Radio.Group>
    </Tags.StyledDrawer>
  );
}
