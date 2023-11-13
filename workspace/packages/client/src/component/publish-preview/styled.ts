import { Popover } from 'antd';
import styled from 'styled-components';

export const PopoverCon = styled.div`
  width: 180px;

  .title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }
`;

export const PopoverMenuItem = styled.div<{ selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 24px;
  justify-content: space-between;
  border-radius: 8px;
  background: ${({ selected }) => (selected ? '#F6F5FF' : '#FFF')};
  font-weight: ${({ selected }) => (selected ? '500' : 'normal')};

  padding: 12px 16px;
  margin: 8px 0;
  color: #212121;
  font-family: IBM Plex Sans;
  font-size: 14px;
  font-style: normal;
  line-height: 20px;

  cursor: pointer;

  ${({ selected }) => (selected
    ? `&::after {
        content: url('https://res.cloudinary.com/di2flcikt/image/upload/f_auto,q_auto/v1/hosting/krqawjthgtj8izph6ldc');
      }`
    : ''
  )};


  &:hover {
    background: #F6F5FF;
  }
`;

export const Header = styled.div`
  position: static;
  background-color: #160245;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #FFF;
  font-family: IBM Plex Sans;
  font-size: 14px;
  font-style: normal;
  font-weight: 700;
  line-height: normal;

  .right-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .publish-btn {
      padding-left: 16px;
      border-left: 1px solid rgba(255, 255, 255, 0.3);
    }

    .action-icon {
      display: flex;
      align-items: center;
      padding: 4px;
      border-radius: 8px;
      transition: all 0.15s ease-in;
      width: 18px;
      cursor: pointer;
    }
  }
`;

// ~~~~~~~~~~~~~~~~~~~~~~ MODAL BODY ~~~~~~~~~~~~~~~~~~~~~~

export const ModalBodyCon = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-direction: column;
  color:  #212121;
  font-family: IBM Plex Sans;
  font-style: normal;

  .section-con {
    display: flex;
    gap: 0.5rem;
    flex-direction: column;
  }

  .section-heading {
    color: #16023e;
    font-size: 16px;
    font-weight: 700;
    margin: 0;
  }


  .section-subheading {
    color: #16023e;
    font-size: 13px;
    margin: 0;
  }

  .section-subheading {
    color: #16023e;
    font-size: 14px;
    font-weight: 400;
    margin: 0
  }

  .ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .copy-outline {
    background-color: #ebebeb;
    color: #7a7a7a;
    padding: 0.3rem;
    margin-left: 0.2rem;
    border-radius: 4px;
    cursor: pointer;
    width: 15px;
    height: 15px;
    display: flex;
    justify-content: center;
  }

  .check-outline {
    background-color: #ebebeb;
    color: #3fb950;
    padding: 0.3rem;
    margin-left: 0.2rem;
    border-radius: 4px;
    cursor: pointer;
    width: 15px;
    height: 15px;
  }
`;

export const MenuItem = styled.div`
  margin: 0 0.25rem;
  display: flex;
`;

export const StyledPopover = styled(Popover)`
  .ant-popover-inner {
    border-radius: 16px !important;
    border: 1px solid #EAEAEA !important;
    background: var(--White, #FFF) !important;
    box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.08) !important;
  }
`;

export const AvatarWrapper = styled.div`
  color: white !important;
  font-size: 0.7rem !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  cursor: pointer !important;
`;

export const BackgroundGradientImg = styled.img`
  filter: blur(194px);
  position: absolute;
  top: 0px;
  right: 0px;
  left: 0px;
  height: 100vh;
  width: 100vw;
  z-index: -1;
  object-fit: cover;  
`;

export const URLCon = styled.div`
  border: 1px solid lightgray;
  border-radius: 12px;
  padding: 0.5rem;
  display: flex;
  justify-content: space-between;
  position: relative;

  .url-content {
    white-space: nowrap;

    scrollbar-color: #7567FF #E5E7EB;
    scrollbar-width: thin;
    overflow-y: hidden;
    overflow-x: auto;
  
    &::-webkit-scrollbar-track {
      padding: 2px 0;
      background-color: #e5e7eb;
      border-radius: 10px;
      border: 1px solid #F3F4F6;
    }
  
    &::-webkit-scrollbar {
      margin: 4px 0;
      height: 4px;
      width: 6px;
    }
  
    &::-webkit-scrollbar-thumb {
      border-radius: 10px;
      background-color: #646e82;
    } 
  }
`;
