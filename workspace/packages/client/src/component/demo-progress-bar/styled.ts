import styled from 'styled-components';

interface ProgressIndicatorConProps {
    top: number;
    left: number;
    width: number;
}

export const ProgressIndicatorCon = styled.div`
    top: ${(props: ProgressIndicatorConProps) => `${props.top}px`};
    left: ${(props: ProgressIndicatorConProps) => `${props.left}px`};
    position: absolute;
    width: ${(props: ProgressIndicatorConProps) => `${props.width}px`};
    margin: 0;
    display: flex;
`;

interface ProgressIndicatorProps {
    width: number;
    currentIndex: number;
    activeIndex: number;
    primaryColor: string;
}

export const ProgressIndicator = styled.div`
    width: ${(props: ProgressIndicatorProps) => `${props.width}px`};
    height: 4px;
    background-color: ${(props: ProgressIndicatorProps) => `${props.primaryColor}`};
    width: ${(props: ProgressIndicatorProps) => (props.currentIndex <= props.activeIndex ? `${props.width}px` : 0)};
    margin: 0;
    transition: width 0.5s ease-in-out;
`;
