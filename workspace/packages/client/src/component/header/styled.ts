import styled from 'styled-components';
import Button from 'antd/lib/button';

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

  &:hover {
    .show-on-hover {
      visibility: visible;
    }
  }

  .show-on-hover {
    visibility: hidden;
  }
`;

export const MenuItem = styled.div`
  margin: 0 0.25rem;
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

export const ModalButtonsContainer = styled.div`
    display: flex;
    margin: 1.5rem 0rem 1rem 0rem;
    gap: 1rem;

    button {
        width: 50%;
        padding: 0.625rem 2rem;
        border-radius: 60px;
        cursor: pointer;
    }

    button.primary {
        background-color: #7567ff;
        color: white;
        border: 1px solid #7567ff;

        &:disabled {
            opacity: 0.5;
        }
    }

    button.secondary {
        background: #FFFFFF;
        border: 1px solid #16023E;
    }
`;

export const TrialBadgeCon = styled.div`
  display: flex;
  margin-left: 0.5rem;
  justify-content: center;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  jlex-direction: row;
  transition: transform 0.2s ease-out;
  transform: translate(0, 0);

  & > a {
    padding: 0.2rem 0.45rem;
    border: 2px solid #ffdf65;
    background: #ff7350;
    border-radius: 4px;
    color: white;
    text-decoration: none;
  }

  &:hover {
    transform: translate(1px, -1px);
    cursor: pointer;
  }
`;
