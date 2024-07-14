import { Modal } from 'antd';
import styled from 'styled-components';

const size = {
  mobileM: '375px',
  mobileL: '425px',
  tablet: '768px',
  laptop: '1024px',
};

interface SectionProps {
  fontColor: string;
  borderRadius: number;
  bgColor: string;
  borderColor: string;
}

export const Section = styled.div`
  background: ${(props: SectionProps) => props.bgColor};
  border-radius: ${(props: SectionProps) => `${props.borderRadius}px`};
  color: ${(props: SectionProps) => props.fontColor};
  border: 1px solid ${(props: SectionProps) => props.borderColor};
`;

export const DemoModal = styled(Modal)`
  .ant-modal-content {
    background-color: var(--f-demomodal-bg-color);
    color: var(--f-demomodal-font-color);
    border: 1px solid var(--f-demomodal-border-color);
    border-radius: var(--f-demomodal-border-radius);
    box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, rgba(0, 0, 0, 0.07) 0px 2px 4px, rgba(0, 0, 0, 0.07) 0px 4px 8px, rgba(0, 0, 0, 0.07) 0px 8px 16px, rgba(0, 0, 0, 0.07) 0px 16px 32px, rgba(0, 0, 0, 0.07) 0px 32px 64px;
  }

  .ant-modal-header {
    background-color: var(--f-demomodal-bg-color);
  }

  .ant-modal-title {
    color: var(--f-demomodal-font-color);
  }

  .ant-modal-footer {
    display: flex;
    justify-content: center;
  }
`;

interface BodyTextProps {
    fontColor: string;
    bgColor: string;
}

export const BodyText = styled.div`
    color: ${(props: BodyTextProps) => `${props.fontColor}`};
    background-color: ${(props: BodyTextProps) => `${props.bgColor}`};
    padding: 10px;
    padding-left: 2rem;
    margin-bottom: 20px;
`;

export const CTACon = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    background: white;
    display:none;
    padding: 40px 0;
    width: 100%;
    right: 1px;
    z-index: 999999;
    position: absolute;
    top: 65px;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;

    &.open-cta-con {
        display: flex;
    }
  }
`;

export const RespCTACon = styled.div`
  display: flex;

  .menu-icon {
    display: none;
  }
      
  @media (max-width: 768px) {
    .menu-icon {
        font-size: 30px;
        display: flex;
    }
}
`;
