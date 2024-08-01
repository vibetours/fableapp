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

export const DHPage = styled.div`
  min-height: 100%;
  background-color: var(--f-body-bg-color);

  .header {
    box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;
    z-index: 999;
    position: relative;
    border-bottom: 1px solid var(--f-header-border-color);
    color: var(--f-header-font-color);
    background-color: var(--f-header-bg-color);
    height: 40px;
    padding: 0.75rem calc(var(--f-page-content-gutter) * 1%);
    display: flex;
    justify-content: space-between;
    align-items: center;

    .logo {
      height: 100%;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;

      > img {
        height: 100%;
      }
    }
  }

  .body {
    background-color: var(--f-body-bg-color);
    color: var(--f-body-font-color);
    padding: 0.75rem
      calc(
        var(--f-page-content-gutter) * 1% + var(--f-body-content-gutter) * 1%
      );
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section-con {
    display: flex;
    flex-direction: column;
    gap: 3rem;
    margin-bottom: 1rem;

    > .section {
      padding: 1rem 1.5rem;
      box-shadow: rgba(0, 0, 0, 0.05) 0px 6px 24px 0px,
        rgba(0, 0, 0, 0.08) 0px 0px 0px 1px;
      display: flex;
      flex-direction: column;
      gap: 1rem;

      > p {
        margin: 0;
      }
    }

    .title {
      font-weight: 600;
      display: flex;
      justify-content: center;
    }
  }

  .demo-card-con {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .demo-card {
    background-color: var(--f-democard-bg-color);
    border: 1px solid var(--f-democard-border-color);
    border-radius: var(--f-democard-border-radius);
    color: var(--f-democard-font-color);

    padding: 0.5rem;
    width: 200px;
    margin: 0 auto;
    box-sizing: border-box;
    cursor: pointer;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px,
      rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
    transition: all 0.2s ease-out;

    &:hover {
      box-shadow: rgba(14, 30, 37, 0.12) 0px 2px 4px 0px,
        rgba(14, 30, 37, 0.32) 0px 2px 16px 0px;

      > .demo-name {
        text-decoration: underline;
      }
    }

    .thumb {
      border-radius: var(--f-democard-border-radius);
      width: 100%;
      margin-bottom: 1rem;
      display: block;
      box-shadow: rgba(9, 30, 66, 0.25) 0px 1px 1px,
        rgba(9, 30, 66, 0.13) 0px 0px 1px 1px;
      height: 130px;
    }

    > .demo-name {
      font-weight: 600;
    }
  }

  .q-body {
    display: flex;
    height: 100%;
    background-color: color-mix(
      in srgb,
      var(--f-sidepanel-con-bg-color) 92%,
      black
    );
  }

  .sidepanel-con {
    width: 22vw;
    max-width: 320px;
    border-right: 1px solid lightgray;
    color: var(--f-sidepanel-con-font-color);
    background-color: var(--f-sidepanel-con-bg-color);
    border-right: 1px solid var(--f-sidepanel-con-border-color);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;

    .sidepanel-card {
      color: var(--f-sidepanel-card-font-color);
      background-color: var(--f-sidepanel-card-bg-color);
      border: 1px solid var(--f-sidepanel-card-border-color);
      border-radius: var(--f-sidepanel-card-border-radius);
      font-size: 1rem;
      padding: 0.5rem 1rem;
      box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px,
        rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease-out;

      .card-title {
        display: flex;
        gap: 0.5rem;
        font-weight: 600;
      }

      .substep {
        font-size: 0.9rem;
        opacity: 0.9;
        font-weight: 400;
        margin-top: 0.75rem;

        &:before {
          content: "";
          position: absolute;
          width: 1px;
          height: 12px;
          border-left: 1px dashed var(--f-sidepanel-card-font-color);
          transform: translate(7px, -12px);
        }

        &.completed {
          &:before {
            border-left: 1px solid var(--f-sidepanel-card-font-color);
          }
        }

        .sidepanel-card-title {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    .cta-con {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin: 0.25rem 0;

      > a {
        min-width: 240px;
        text-align: center;

        button {
          width: 100% !important;
        }
      }
    }
  }
`;

export const RootCon = styled(DHPage)`

`;

export const PreviewFrameWrapper = styled.div<{ showOverlay: boolean }>`
  flex-grow: 1;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem;
  position: relative;
  margin: auto;

  .replay-overlay {
    width: 100%;
    height: 100%;
    position: absolute;    
    background-color: ${({ showOverlay }) => (showOverlay ? 'rgba(0, 0, 0, 0.8)' : '')};
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: center;
    align-items: center;
  }

  .preview-frame {
    display: block;
    border: none;
    border-radius: 1rem;  
    height: 100%;
  }
`;
