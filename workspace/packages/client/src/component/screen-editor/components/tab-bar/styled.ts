import styled from 'styled-components';

interface TabActiveProp {
  active?: boolean;
}

export const TabItemsCon = styled.div`
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #DDDDDD;
`;

export const TabItem = styled.div`
  font-size: 16px;
  width: 176px;
  text-align: center;
  font-weight: 500;
  cursor: pointer;
  line-height: 20px;
`;

export const TabTitle = styled.span`
  display: inline-block;
  padding: 10px 0;    
  position: relative;
  color: ${(props: TabActiveProp) => (props.active ? '#7567FF' : '#000')};
`;

export const TabActiveHighlight = styled.div`
  position: absolute;
  width: 100%;
  height: ${(props: TabActiveProp) => (props.active ? '3px' : '0px')};
  background-color: #7567FF;
  border-radius: 1.5px;
  bottom: -3px;
`;
