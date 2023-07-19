import styled from 'styled-components';

export const BtnGroup = styled.div`
  span {
    padding: 0.5rem 1rem;
    font-weight: 500;
    cursor: pointer;
  }

  span:first-child {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
  }
  span:last-child {
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  span.sel {
    background: #7567FF;
    border: 1px solid #7567FF;
    color: white;
  }

  span.nasel {
    border: 1px solid #eaeaea;
  }
`;

export const LineCon = styled.div`
  path.mg-line {
    fill: none;
    stroke-width: 3;
  }
`;

export const KPIHead = styled.div`
  span.label {
    font-size: 1.5rem;
    opacity: 0.75;
  }

  span.val {
    font-size: 2rem;
    margin-left: 0.5rem;
    font-weight: 500;
  }
`;

export const KPICon = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  background: #fafafa;
  border-radius: 8px;
  gap: 2rem;
`;
