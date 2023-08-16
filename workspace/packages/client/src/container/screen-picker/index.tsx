import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { ScreenType } from '@fable/common/dist/api-contract';
import { ArrowUpOutlined, FileImageOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons';
import { getDisplayableTime } from '@fable/common/dist/utils';
import { LoadingStatus } from '@fable/common/dist/types';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import { AddScreenToTour, AnnAdd, addScreenToTour, getAllScreens, uploadImgScreenAndAddToTour } from '../../action/creator';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { AnnotationPerScreen } from '../../types';

import * as GTags from '../../common-styled';
import * as Tags from './styled';
import { getAnnotationsPerScreen } from '../../utils';
import UploadImageScreen from './upload-image-screen';
import { ScreenPickerMode } from '../../component/timeline/types';
import Loader from '../../component/loader';
import Button from '../../component/button';

interface IDispatchProps {
  getAllScreens: (forceRefresh?: boolean) => void;
  addScreenToTour: AddScreenToTour;
  uploadImgScreenAndAddToTour: (
    screenName: string,
    screenImgFile: File,
    tourRid: string,
    shouldNavigate: boolean,
  ) => void
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  getAllScreens: (forceRefresh: boolean = false) => dispatch(getAllScreens(forceRefresh)),
  addScreenToTour: (
    screen,
    tourRid,
    shouldNavigate,
    annAddData,
  ) => dispatch(addScreenToTour(screen, tourRid, shouldNavigate, annAddData)),
  uploadImgScreenAndAddToTour: (
    screenName,
    screenImgFile,
    tourRid,
    shouldNavigate,
  ) => dispatch(uploadImgScreenAndAddToTour(screenName, screenImgFile, tourRid, shouldNavigate))

});

interface IAppStateProps {
  rootScreens: P_RespScreen[];
  tour: P_RespTour | null;
  allAnnotationsForTour: AnnotationPerScreen[];
  screenLoadingFinished: boolean;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  rootScreens: state.default.rootScreens,
  tour: state.default.currentTour,
  allAnnotationsForTour: getAnnotationsPerScreen(state),
  screenLoadingFinished: state.default.allScreensLoadingStatus === LoadingStatus.Done
});

interface IOwnProps {
  isOpenScreenPicker: boolean;
  hideScreenPicker: () => void;
  screenPickerMode: ScreenPickerMode;
  addAnnotationData?: AnnAdd;
  addCoverAnnToScreen?: (screenId: number) => void;
  dontShowCloseBtn?: boolean;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenId: string;
    annotationId?: string;
  }>;

type IOwnStateProps = {
  screensNotPartOfTour: P_RespScreen[],
  screensPartOfTour: P_RespScreen[],
  showUploadScreenImgModal: boolean,
  currentPage: number,
}

const ITEMS_PER_PAGE = 15;

interface ScreenComponentProps {
  screen: P_RespScreen;
  handleAddScreen: (screen: P_RespScreen) => void;
}

function ScreenCard({ screen, handleAddScreen }: ScreenComponentProps): ReactElement {
  return (
    <Tags.Screen
      key={screen.id}
      onClick={() => {
        handleAddScreen(screen);
      }}
    >
      <Tags.ScreenThumbnail src={screen.thumbnailUri.href} alt={screen.displayName} />
      <Tags.ScreenContent>
        <Tags.ScreenTitleIconCon>
          <GTags.Txt className="card-title">{screen.displayName}</GTags.Txt>
          <div>
            {
              screen.type === ScreenType.SerDom ? <FileTextOutlined /> : <FileImageOutlined />
            }
          </div>
        </Tags.ScreenTitleIconCon>
        {
          screen.type === ScreenType.SerDom && (
            <Tags.ScreenLink onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(screen.url, '_blank');
            }}
            >
              <ArrowUpOutlined style={{ color: '#7567ff', transform: 'rotate(45deg)' }} />
              <GTags.Txt className="subtitle">{screen.url}</GTags.Txt>
            </Tags.ScreenLink>)
        }
        <Tags.ScreenTitleIconCon>
          <GTags.Txt className="subtitle">
            Created {getDisplayableTime(screen.createdAt)}
          </GTags.Txt>
          <GTags.Avatar src={screen.createdBy.avatar} alt="profile" />
        </Tags.ScreenTitleIconCon>
      </Tags.ScreenContent>
    </Tags.Screen>
  );
}

class ScreenPicker extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      screensNotPartOfTour: [],
      screensPartOfTour: [],
      showUploadScreenImgModal: false,
      currentPage: 1,
      // screenLoading: true,
    };
  }

  componentDidMount(): void {
    this.props.getAllScreens();
    this.formAndSetScreensNotPartOfTour();
    this.setScreensPartOfTour();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (this.props.screenLoadingFinished && prevProps.screenLoadingFinished !== this.props.screenLoadingFinished) {
      this.formAndSetScreensNotPartOfTour();
    }

    if (this.props.tour && prevProps.tour !== this.props.tour) {
      this.setScreensPartOfTour();
    }
  }

  formAndSetScreensNotPartOfTour = (): void => {
    const rootScreensMap = this.props.rootScreens.reduce((store, srn) => {
      store[srn.id] = srn;
      return store;
    }, {} as Record<string, P_RespScreen>);
    for (const screenAnnPair of this.props.allAnnotationsForTour) {
      delete rootScreensMap[screenAnnPair.screen.parentScreenId];
    }
    const srnNotPartOfTour = Object.values(rootScreensMap).sort((m, n) => +n.updatedAt - +m.updatedAt);
    this.setState({ screensNotPartOfTour: srnNotPartOfTour });
  };

  setScreensPartOfTour = (): void => {
    if (this.props.tour) {
      this.setState({
        screensPartOfTour: this.props.tour.screens?.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        || [] });
    }
  };

  handleAddScreenPartOfTour = (screen: P_RespScreen): void => {
    const screenId = screen.id;
    const screenRid = screen.rid;

    if (this.props.screenPickerMode === 'create') {
      this.props.addCoverAnnToScreen!(screenId);

      // TODO[rrl] do this once api endpoint is completed
      setTimeout(() => {
        this.props.hideScreenPicker();
      }, 1000);
    } else {
      const url = `/tour/${this.props.tour!.rid}/${screenRid}`;
      this.props.navigate(url);
    }
  };

  handleAddScreenNotPartOfTour = (screen: P_RespScreen): void => {
    if (this.props.screenPickerMode === 'create') {
      this.props.addScreenToTour(
        screen,
        this.props.tour!.rid,
        false,
        this.props.addAnnotationData!
      );

      // TODO[rrl] do this once api endpoint is completed
      setTimeout(() => {
        this.props.hideScreenPicker();
      }, 1000);
    } else {
      this.props.addScreenToTour(
        screen,
        this.props.tour!.rid,
        true,
      );
    }
  };

  handleLoadMoreScreens = (): void => {
    this.setState((prevState) => ({
      currentPage: prevState.currentPage + 1,
    }));
  };

  shouldShowPaginationOption = (paginatedScreens: P_RespScreen[]): boolean => paginatedScreens.length < this.state.screensNotPartOfTour.length;

  render(): JSX.Element {
    const endIndex = this.state.currentPage * ITEMS_PER_PAGE;
    const paginatedScreensNotPartOfTour = this.state.screensNotPartOfTour.slice(0, endIndex);

    return (
      <>
        <Tags.ScreenPickerContainer
          open={this.props.isOpenScreenPicker}
          onCancel={this.props.hideScreenPicker}
          footer={null}
          style={{ height: '88vh' }}
          width="100vw"
          zIndex={2000}
          closable={!this.props.dontShowCloseBtn}
        >
          <Tags.ScreenTab>
            <GTags.Txt
              className="title"
              style={{ marginBottom: '0.5rem' }}
            >
              Select a screen to add it in the tour
            </GTags.Txt>
            {!this.props.screenLoadingFinished && (
              <Loader width="100px" txtBefore="Loading all screens" showAtPageCenter />
            )}
            {
              this.props.screenLoadingFinished && (
                <>
                  <Tags.ScreenPicker>
                    <Tags.Screen
                      onClick={() => {
                        this.setState({ showUploadScreenImgModal: true });
                      }}
                      style={{ border: '1px dashed #7566ff' }}
                    >
                      <Tags.UploadImgCont>
                        <UploadOutlined style={{ fontSize: '3rem' }} />
                        <GTags.Txt className="title2">Upload screen image</GTags.Txt>
                      </Tags.UploadImgCont>
                    </Tags.Screen>
                    {this.state.screensPartOfTour.map(screen => (
                      <ScreenCard screen={screen} handleAddScreen={this.handleAddScreenPartOfTour} key={screen.id} />
                    ))}
                    {paginatedScreensNotPartOfTour.map(screen => (
                      <ScreenCard screen={screen} handleAddScreen={this.handleAddScreenNotPartOfTour} key={screen.id} />
                    ))}
                  </Tags.ScreenPicker>
                  {this.shouldShowPaginationOption(paginatedScreensNotPartOfTour) && (
                    <Button
                      onClick={this.handleLoadMoreScreens}
                      style={{
                        width: 'fit-content',
                        alignSelf: 'center',
                        position: 'fixed',
                        bottom: '60px',
                        zIndex: 10
                      }}
                    >
                      Load more screens
                    </Button>
                  )}
                  {this.shouldShowPaginationOption(paginatedScreensNotPartOfTour) && (
                  <Tags.Blur />
                  )}
                </>
              )
            }
          </Tags.ScreenTab>
        </Tags.ScreenPickerContainer>
        {
          this.state.showUploadScreenImgModal && (
            <UploadImageScreen
              open={this.state.showUploadScreenImgModal}
              closeModal={() => this.setState({ showUploadScreenImgModal: false })}
              tourRid={this.props.tour!.rid}
              uploadImgScreenAndAddToTour={(screenName: string, screenImgFile: File) => {
                this.props.uploadImgScreenAndAddToTour(
                  screenName,
                  screenImgFile,
                  this.props.tour!.rid,
                  false
                );
              }}
            />
          )
        }
      </>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ScreenPicker));
