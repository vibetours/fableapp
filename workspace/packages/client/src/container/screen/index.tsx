import { DownOutlined } from '@ant-design/icons';
import { LoadingStatus, ScreenData } from '@fable/common/dist/types';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import {
  clearCurrentScreenSelection,
  copyScreenForCurrentTour,
  getAllScreens,
  getAllTours,
  loadScreenAndData
} from '../../action/creator';
import * as GTags from '../../common-styled';
import Btn from '../../component/btn';
import Header from '../../component/header';
import Loader from '../../component/loader';
import ScreenPreview from '../../component/screen-editor/preview';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import * as Tags from './styled';

interface IDispatchProps {
  loadScreenAndData: (rid: string) => void;
  getAllTours: () => void;
  copyScreenForCurrentTour: (tour: P_RespTour, screen: P_RespScreen) => void;
  createANewTourAndAddThisScreenToIt: (screen: P_RespScreen) => void;
  clearCurrentScreenSelection: () => void;
  getAllScreens: () => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  loadScreenAndData: (rid: string) => dispatch(loadScreenAndData(rid)),
  getAllTours: () => dispatch(getAllTours(false)),
  getAllScreens: () => dispatch(getAllScreens(false)),
  copyScreenForCurrentTour:
    (tour: P_RespTour, screen: P_RespScreen) => dispatch(copyScreenForCurrentTour(tour, screen)),
  createANewTourAndAddThisScreenToIt:
    (screen: P_RespScreen) => dispatch(copyScreenForCurrentTour(null, screen)),
  clearCurrentScreenSelection: () => dispatch(clearCurrentScreenSelection()),
});

interface IAppStateProps {
  screen: P_RespScreen | null;
  serScreenData: ScreenData | null;
  screenLoaded: LoadingStatus;
  tours: P_RespTour[];
  rootScreens: P_RespScreen[];
  allToursLoadingStatus: LoadingStatus;
  allScreensLoadingStatus: LoadingStatus;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  screen: state.default.currentScreen,
  serScreenData: state.default.screenData,
  screenLoaded: state.default.screenLoadingStatus,
  rootScreens: state.default.rootScreens,
  tours: state.default.tours,
  allToursLoadingStatus: state.default.allToursLoadingStatus,
  allScreensLoadingStatus: state.default.allScreensLoadingStatus,
});

interface IOwnProps {}
type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    screenId: string;
  }>;

interface IOwnStateProps {
  toursThatDoesNotHaveThisScreen: P_RespTour[];
}

class Screen extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      toursThatDoesNotHaveThisScreen: []
    };
  }

  componentDidMount(): void {
    this.props.loadScreenAndData(this.props.match.params.screenId);
    this.props.getAllScreens();
    this.props.getAllTours();
  }

  componentDidUpdate(prevProps: Readonly<IProps>): void {
    if (this.props.screen && !this.props.screen.isRootScreen) {
      // If some how a screen is rendered in this route that is not a root screen then we take them to
      // tour page
      window.location.replace(`/tour/${this.props.screen.tour?.rid}/${this.props.screen.rid}`);
    }

    const prevScreenId = prevProps.screen ? prevProps.screen.id : '';
    const currScreenId = this.props.screen ? this.props.screen.id : '';
    const prevAllToursLoaded = prevProps.allToursLoadingStatus === LoadingStatus.Done;
    const currAllTourLoaded = this.props.allToursLoadingStatus === LoadingStatus.Done;
    const prevAllScreenLoaded = prevProps.allScreensLoadingStatus === LoadingStatus.Done;
    const currAllScreenLoaded = this.props.allScreensLoadingStatus === LoadingStatus.Done;

    if ((currAllTourLoaded && currAllScreenLoaded && prevScreenId !== currScreenId && currScreenId)
    || (prevAllToursLoaded !== currAllTourLoaded && currAllTourLoaded && currAllScreenLoaded && currScreenId)
    || (prevAllScreenLoaded !== currAllScreenLoaded && currAllTourLoaded && currAllScreenLoaded && currScreenId)) {
      const toursIncluded: Record<string, 1> = {};
      let screen = this.props.screen!;
      if (screen.isRootScreen) {
        const match = this.props.rootScreens.find(s => s.id === screen.id);
        if (match) screen = match;
      }
      screen.related.reduce((hm, s) => {
        if (s.tour?.rid) {
          hm[s.tour.rid] = 1;
        }
        return hm;
      }, toursIncluded);

      const toursThatDoesNotHaveThisScreen = this.props.tours.filter(t => !(t.rid in toursIncluded));
      this.setState({ toursThatDoesNotHaveThisScreen });
    }
  }

  componentWillUnmount() {
    this.props.clearCurrentScreenSelection();
  }

  getHeaderTxtEl = (): ReactElement => {
    if (this.props.screenLoaded !== LoadingStatus.Done) {
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
          {this.props.screenLoaded === LoadingStatus.Done ? (
            <GTags.PreviewAndActionCon>
              <GTags.EmbedCon style={{ overflow: 'hidden', position: 'relative' }}>
                <ScreenPreview
                  screen={this.props.screen!}
                  screenData={this.props.serScreenData!}
                  divPadding={18}
                  onBeforeFrameBodyDisplay={() => {}}
                  onFrameAssetLoad={() => {}}
                  isScreenPreview
                />
              </GTags.EmbedCon>
              <GTags.EditPanelCon style={{ overflowY: 'auto' }}>
                {this.state.toursThatDoesNotHaveThisScreen.length > 0 && (
                  <Tags.ActionLI>
                    <GTags.Txt
                      className="title2"
                      style={{
                        marginBottom: '0.5rem'
                      }}
                    >Add this screen to an existing tour from the below list
                    </GTags.Txt>
                    <Dropdown
                      trigger={['click']}
                      menu={{
                        onClick: (e) => {
                          const tourRid = e.key;
                          const tourToBeCopiedTo = this.props.tours.find(t => t.rid === tourRid);
                          if (tourToBeCopiedTo) {
                            this.props.copyScreenForCurrentTour(tourToBeCopiedTo, this.props.screen!);
                          } else {
                            throw new Error(`Cannot find tour or screen by id ${tourRid
                            } in list while associating a tour with screen`);
                          }
                        },
                        items: this.state.toursThatDoesNotHaveThisScreen.map(t => ({
                          key: t.rid,
                          label: (
                            <div>
                              <GTags.Txt
                                className="title2"
                                style={{ fontSize: '0.9rem' }}
                              >{t.displayName}
                              </GTags.Txt>
                              <GTags.Txt className="subsubhead">
                                Last updated {t.displayableUpdatedAt}
                              </GTags.Txt>
                            </div>
                          )
                        }
                        ))
                      }}
                    >
                      <Button>
                        Select a tour from the list
                        <DownOutlined />
                      </Button>
                    </Dropdown>
                  </Tags.ActionLI>
                )}
                <Tags.ActionLI>
                  <GTags.Txt
                    className=""
                    style={{
                      marginBottom: '0.5rem'
                    }}
                  >{this.state.toursThatDoesNotHaveThisScreen.length > 0 ? 'alternatively you ' : 'you '}
                    can create a new tour with this screen
                  </GTags.Txt>
                  <Btn
                    icon="plus"
                    type="primary"
                    onClick={() => {
                      this.props.createANewTourAndAddThisScreenToIt(this.props.screen!);
                    }}
                  >
                    Create a new tour
                  </Btn>
                </Tags.ActionLI>
              </GTags.EditPanelCon>
            </GTags.PreviewAndActionCon>
          ) : (
            <Loader width="240px" />
          )}
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Screen));
