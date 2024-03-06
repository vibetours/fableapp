import styled from 'styled-components';
import { ResponsiveContainer } from 'recharts';

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

export const ChartCon = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  top: 2rem;
`;

export const KpiAndVisitorCon = styled.div`
  display: flex;
  margin: 10%;
  margin-top: 1rem;
  margin-bottom: 1rem;
  gap: 1.5rem;
  align-items: stretch;
`;

export const FunnelCon = styled.div`
  margin: 10%;
  margin-top: 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const KPIHead = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  .label {
    font-size: 1.25rem;
    opacity: 0.75;
  }

  .val {
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
  background: radial-gradient(circle at 18.7% 37.8%, rgb(250, 250, 250) 0%, rgb(225, 234, 238) 90%);
  border-radius: 16px;
  position: relative;
  padding: 1.5rem 0;
  gap: 2rem;

  .loader {
    position: absolute;
    background: #eeeeeecf;
    height: 100%;
    width: 100%;
    transform: translateY(-1.5rem);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
    font-size: 2rem;
    border-radius: 16px;
  }

  .helpcn {
    position: absolute;
    right: 0;
    top: 0;
  }
`;

export const FunnelSelectOverlay = styled.div`
  background-color: #fafafa8f;
  position: absolute;
  cursor: pointer;
  border-radius: 2px;
`;

export const FunnelSelectData = styled.div`
  width: 20%;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  padding: 0rem 0.5rem 1rem 1rem;
  align-items: center;
  justify-content: space-between;

  .con {
    width: calc(100% - 3rem);
  }

  a {
    color: #747474;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .x-sm {
    font-size: x-small;
  }

  .sm {
    font-size: small;
  }

  .conv {
    font-size: 1.15rem;
  }

  .dist-chart {
    position: relative;
    height: 145px;
    padding: 0px 2px 0;
    display: flex;
    flex-direction: column;
    justify-content: end;
  }

  .con {
    padding: 0px 8px;
    overflow: auto;

    .ann-txt {
      font-size: 0.85rem;
      line-height: 0.95rem;
      padding-top: 8px;
    }

    .sess {
      font-size: 1.5rem;
    }
  }
`;

export const SvgCon = styled.div`
  position: relative;

  .w-adj-btn {
    position: absolute;
    top: -96px;
    right: 26px;

    button  {
    }
  } 
`;
