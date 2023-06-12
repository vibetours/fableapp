import styled from 'styled-components';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';

export const ConLogoImg = styled.img`
  height: 2.5rem;
`;

export const Con = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  background: ${(props) => props.theme.colors.dark.idle.background};
`;

export const LogoCon = styled.div`
  margin: 0.35rem 1.5rem;
  padding: 0.35rem 1.5rem;
  font-size: 1rem;
`;

export const RMenuCon = styled.div`
  margin: 0.25rem 1.5rem;
  padding: 0.25rem 1.5rem;
  display: flex;
`;

export const LMenuCon = styled.div`
  margin: 0rem 1.5rem;
  display: flex;
  align-items: center;
`;

export const MenuItem = styled.div`
  margin: 0 0.25rem;
`;

export const ShareModal = styled(Modal)`

  border-radius: 15px;
  border-top: double 4px transparent;
  background-image: linear-gradient(white, white), linear-gradient(to right,  #FF7450 0%, #FF7450 33.33%, #FEDF64 33.33%, #FEDF64 66.67%, #7567FF 66.67%, #7567FF 100%);
  background-clip: padding-box, border-box;

  .ant-modal-content {
    -webkit-box-shadow: none;
    -moz-box-shadow: none;
    -o-box-shadow: none;
    box-shadow: none;
    padding: 32px;
    border-radius: 20px;
  }

  .ant-modal-title {
    font-family: "IBM Plex Sans", sans-serif;
    color: #16023e;
    font-size: 16px;
    font-weight: 700;
  }
`;

export const SMButton = styled(Button)`
  display: flex;
  align-items: center;
  font-size: 14px;
  line-height: 24px;
  font-weight: 500;
  height: 40px;
  flex-grow: 1;
  justify-content: center;
  font-family: "IBM Plex Sans", sans-serif;
`;

export const SMText = styled.p`
  ::-webkit-scrollbar {
    width: 12px;
  }

  ::-webkit-scrollbar-track {
    background-color: #f5f5f5;
  }

  ::-webkit-scrollbar-thumb {
    background-color: #888;
    border-radius: 6px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: #555;
  }

  border: 1px solid #7567FF;
  padding: 5px;
  max-height: 196px; 
  overflow-y: auto;
`;
