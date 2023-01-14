import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { ScreenData } from '@fable/common/dist/types';
import { TState } from '../../reducer';
import Header from '../../component/header';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { loadScreenAndData } from '../../action/creator';
import * as GTags from '../../common-styled';
import ScreenEditor from '../../component/screen-editor';
import { P_RespScreen } from '../../entity-processor';

interface IDispatchProps {
  loadScreenAndData: (rid: string) => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  loadScreenAndData: (rid: string) => dispatch(loadScreenAndData(rid)),
});

interface IAppStateProps {
  screen: P_RespScreen | null;
  serScreenData: ScreenData | null;
  isLoaded: boolean;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  screen: state.default.currentScreen,
  serScreenData: state.default.screenData,
  isLoaded: state.default.screenLoaded,
});

interface IOwnProps {}
type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    screenId: string;
  }>;

interface IOwnStateProps {}

class ScreenPreview extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    this.props.loadScreenAndData(this.props.match.params.screenId);
  }

  getHeaderTxtEl = (): ReactElement => {
    if (!this.props.isLoaded) {
      return <></>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <GTags.Txt className="subsubhead">Previewing screen</GTags.Txt>
        <GTags.Txt className="head" style={{ lineHeight: '1.5rem' }}>
          {this.props.screen?.displayName}
        </GTags.Txt>
      </div>
    );
  };

  render() {
    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header shouldShowLogoOnLeft navigateToWhenLogoIsClicked="/screens" titleElOnLeft={this.getHeaderTxtEl()} />
        </GTags.HeaderCon>
        <GTags.BodyCon style={{ height: '100%', background: '#fcfcfc' }}>
          {/* this.props.isLoaded ? (
            <ScreenEditor screen={this.props.screen!} screenData={this.props.serScreenData!} />
          ) : (
            <></>
          ) */}
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ScreenPreview));
