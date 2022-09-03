import React from "react";
import { connect } from "react-redux";
import { TState } from "../../reducer";
import { sampleActionCreator } from "../../action/creator";

interface IOwnProps {
  idText: string;
}

interface IDispatchProps {
  updateCounter: (counter: number) => void;
}

interface IAppStateProps {
  counterVal: number;
}

const mapStateToProps = (state: TState): IAppStateProps => {
  return {
    counterVal: state.sample.counter || 0,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    updateCounter: (counter: number) => dispatch(sampleActionCreator(counter)),
  };
};

type IProps = IOwnProps & IAppStateProps & IDispatchProps;

interface IOwnStateProps {}

class ComponentClassName extends React.PureComponent<IProps, IOwnStateProps> {
  render() {
    return (
      <div className="sampleContainer">
        {this.props.idText}
        <div style={{ paddingTop: 30 }}>
          <div>{this.props.counterVal}</div>
          <button style={{ marginTop: 30 }} onClick={() => this.props.updateCounter(2)}>
            Update Counter
          </button>
        </div>
      </div>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(ComponentClassName);
