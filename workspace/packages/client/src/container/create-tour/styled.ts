import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: column;
  padding: 2.4rem;
  padding-top: 0;
`;

export const SkeletonCon = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
`;

export const SkeletonGrid = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  width: 100%;
`;

export const Heading = styled.h1`
    margin: 0 0 1rem 0;
    font-size: 2rem;
`;

export const Description = styled.p`
    margin-bottom: 1rem;
    font-size: 1.15rem;
`;

export const LoadingToast = styled.div`
    background-color: #FFEFE6;
    color: #C39377;
    font-size: 0.875rem;
    padding: 0.75rem 2.5rem;
    box-shadow: 0px 3px 1px rgba(195, 147, 119, 0.3);
    border-radius: 1rem;
    position: fixed;
    bottom: 7.75rem;
`;

export const ModalContainer = styled.div`
    margin: 2.5rem 1rem 1.5rem 1rem;
`;

export const PrimaryButton = styled.button<{ main?: boolean}>`
    background: #7567FF;
    color: white;
    border: 1px solid #7567FF;
    display: block;
    width: 80%;
    cursor: pointer;
    padding: 1rem 3rem;
    font-weight: 600;
    border-radius: 2.5rem;
    font-size: 1.2rem;
    
    span {
        margin-left: 0.5rem;
    }
`;

export const SecondaryButton = styled.button<{ main?: boolean }>`
    background: #FFFFFF;
    border: 1px solid #16023E;
    display: block;
    width: 80%;
    cursor: pointer;
    padding: ${props => (props.main ? '1rem 3rem' : '0.85rem 2.5rem')};
    border-radius: 2.5rem;
    font-weight: 600;
    font-size: 1.2rem;
    
    span {
        margin-right: 0.5rem;
    }
`;

export const DangerButton = styled.button`
  background: transparent;
  border: none;
  display: block;
  width: 80%;
  padding: 0rem 0;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease-out;

  .target {
    color: #ff7350;
    font-weight: 600;
  }

  &:hover {
    .target {
      text-decoration: underline;
    }
  }

`;

export const InputLabel = styled.label`
    font-weight: 700;
    font-size: 1rem;
    line-height: 21px;
    color: #16023E;
    margin-bottom: 1.5rem;
    display: inline-block;
`;

export const NameTourInputContainer = styled.div`
    position: relative;
    font-size: 1.2rem;
    
    input {
        background: #FFFFFF;
        border: 1px solid #7567FF;
        border-radius: 8px;
        font-weight: 600;
        font-size: inherit;
        padding: 0.85rem 1rem 0.85rem 3rem;
        width: 90%;
    }
`;

export const ModalButtonsContainer = styled.div`
    display: flex;
    margin: 1.5rem 0 0;
    gap: 1rem;
`;

export const FableColorSplit = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height:5px;
    display: flex;

    div {
        width: 40%;
        border-radius: 12px;
        z-index: 2;
        height: 5px;

        &:nth-child(1) {
          background-color: #ff7450;
        }

        &:nth-child(2) {
          background-color: #fedf64;
        }

        &:nth-child(3) {
          background-color: #7567ff;
        }

        &:not(:first-child) {
        margin-left: -18px;
        }
    }
`;

export const TourHeading = styled.h1`
    margin: 2rem 3.625rem;
    font-size: 1.25rem;
`;

export const SearchInputContainer = styled.div`
    width: 90%;
    margin: auto;
 
    .ant-select-selection-placeholder {
        padding: 3px 35px !important;
        font-size: 12px;
    }

    input {
        height: 36px;
        background: #F1F3F4;
        border-radius: 20px;
        border: 1px solid #F1F3F4;
        display: block;
        padding-left: 35px;

        &::placeholder {
            padding-left: 20px;
        }
    }
`;

export const SearchInputWrapper = styled.div`
    width: 90%;
    margin: auto;
    position: relative;
`;

export const HeartLoaderCon = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    display: flex;
    flex-direction: column;
    gap: 2rem;
`;

export const AnnotationContainer = styled.div`
    display: flex; 
    flex-wrap: wrap; 
    gap: 40px; 
    min-height: 240px;
    align-items: center;
    justify-content: center;
`;

export const AnnContentOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(33, 33, 33, 0.60);
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.3s;
    &:hover{
        opacity: 1;
    }
`;

interface modalConfig{
    showBorder: boolean;
}

export const AnnCardContainer = styled.div`
    position: relative;
    border-radius: 4px;

    &:before{
        opacity: 0;
        z-index: -1;
        content: '';
        position: absolute;    
    }

    .fable-ann-card{
        border: none;
    }
`;

export const ConLogoImg = styled.img`
  height: 3.5rem;
  margin: 2rem 0;
`;

export const HeaderText = styled.div`
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
`;

export const SubheaderText = styled.div`
  font-size: 1.2rem;
  font-weight: 400;
  margin-bottom: 3rem;
`;
