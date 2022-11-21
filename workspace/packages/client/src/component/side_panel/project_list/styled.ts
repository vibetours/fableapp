import styled from "styled-components";

interface IAllProjects{
  showProjects: boolean;
}

const Btn = `
  cursor: pointer;
  user-select: none;
  div{
    position: relative;
    margin-left: 1.6rem;
    padding: 0.4rem 1rem;
  }
  p {
    margin: 0;
    margin-left: 0.8rem;
  }
`;

export const AllProjectsCon = styled.div<IAllProjects>`
  background-color: rgba(118, 103, 255, 0.1);
  border-radius: 18px;
  color: white;
`;
  
  export const ProjectsBtn = styled.div`
  position: relative;
  border-radius: 0 18px 18px 0;
  background-color: #7567ff;
  padding: 0.6rem 2rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s linear;
  position: relative;
  user-select: none;

  ${Btn};
`;

export const ProjectsCon = styled.div<IAllProjects>`
  height: ${(props) => (props.showProjects ? 'auto' : "0")};
  padding: ${(props) => (props.showProjects ? "0.2rem 0": "0")};
  overflow: hidden;
  transition: all 0.3s ease-out;
`;

export const ProjectCon = styled.div`
  & > div {
    &:nth-child(2) {}
  }
`;

export const ProjectItems = styled.div<IAllProjects>`
  height: ${(props) => (props.showProjects ? 'auto' : "0")};
  padding: ${(props) => (props.showProjects ? "0.2rem 0": "0")};
  overflow: hidden;
  transition: all 0.3s ease-out;
`;

export const ProjectItem = styled.div`

`;

export const ProjectItemList = styled.ul<IAllProjects>`
  list-style: none;
  padding: ${(props) => (props.showProjects ? "0.1rem 0": "0")};
  margin: 0;
  height: ${(props) => (props.showProjects ? 'auto' : "0")};
  overflow: hidden;
  transition: all 0.3s ease-out;

  li{
    padding: 0.4rem 0;

    span{
      margin-left: 5.4rem;
    }

    &:hover{
      cursor: pointer;
      background-color: rgba(118, 103, 255, 0.3);
    }
  }
`;

export const ProjectBtn = styled.div`
  div{
    margin-left: 1.6rem;
    padding: 0.4rem 1rem;
  }
  ${Btn}
`;

export const ProjectItemBtn = styled.div`
  ${Btn};
  div{
    margin-left: 2.8rem;
  }
`;

export const RightArrow = styled.img<IAllProjects>`
  position: absolute;
  left: 0.8rem;
  top: 50%;
  transform: ${(props) => (props.showProjects ? 'translateY(-50%) rotate(90deg)' : 'translateY(-50%) rotate(0deg)')};
  transition: all 0.3s ease-out;
`;