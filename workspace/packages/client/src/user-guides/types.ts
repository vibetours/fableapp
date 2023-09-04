import { TourStepProps } from 'antd';

export const USER_GUIDE_LOCAL_STORE_KEY = 'fable/user_guide';

export interface TourStepPropsWithElHotspotConfig extends TourStepProps {
  hotspot?: boolean;
  hideNavButtons?: boolean;
  hotspotTarget?: () => Element;
  width?: string;
}

export interface Guide {
  id: string;
  name: string;
  steps: TourStepPropsWithElHotspotConfig[];
}

export interface GuideProps {
  goToNextUserGuide: () => void;
  isVisible: boolean;
}
