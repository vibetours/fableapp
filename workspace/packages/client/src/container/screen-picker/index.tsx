import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { ScreenType } from '@fable/common/dist/api-contract';
import { ArrowUpOutlined, FileImageOutlined, FileTextOutlined, RightSquareFilled, UploadOutlined } from '@ant-design/icons';
import { getDisplayableTime } from '@fable/common/dist/utils';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import { AddScreenToTour, AnnAdd, addScreenToTour, getAllScreens } from '../../action/creator';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { AnnotationPerScreen } from '../../types';

import * as GTags from '../../common-styled';
import * as Tags from './styled';
import { getAnnotationsPerScreen } from '../../utils';
import UploadImageScreen from './upload-image-screen';
import { ScreenPickerMode } from '../../component/timeline/types';
import Loader from '../../component/loader';

interface IDispatchProps {
  getAllScreens: () => void;
  addScreenToTour: AddScreenToTour;
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  getAllScreens: () => dispatch(getAllScreens(false)),
  addScreenToTour: (
    screen,
    tourRid,
    shouldNavigate,
    annAddData,
  ) => dispatch(addScreenToTour(screen, tourRid, shouldNavigate, annAddData)),
});

interface IAppStateProps {
  rootScreens: P_RespScreen[];
  tour: P_RespTour | null;
  allAnnotationsForTour: AnnotationPerScreen[];
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  rootScreens: state.default.rootScreens,
  tour: state.default.currentTour,
  allAnnotationsForTour: getAnnotationsPerScreen(state),
});

interface IOwnProps {
  isOpenScreenPicker: boolean;
  hideScreenPicker: () => void;
  screenPickerMode: ScreenPickerMode;
  addAnnotationData?: AnnAdd;
  addCoverAnnToScreen?: (screenId: number) => void;
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
  screenLoading: boolean
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
      screenLoading: true,
    };
  }

  componentDidMount(): void {
    this.props.getAllScreens();
    this.formAndSetScreensNotPartOfTour();
    this.setScreensPartOfTour();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (prevProps.rootScreens !== this.props.rootScreens) {
      this.formAndSetScreensNotPartOfTour();
      this.setState({ screenLoading: false });
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
    this.setState({ screensPartOfTour: this.props.tour?.screens || [] });
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
        >
          <Tags.ScreenPickerTabs
            items={[{
              key: 'all-screens',
              label: 'All Screens',
              children: (
                <Tags.ScreenTab>
                  {this.state.screensNotPartOfTour.length > 0 ? (
                    <>
                      <GTags.Txt
                        className="title"
                        style={{ marginBottom: '0.5rem' }}
                      >Select a screen to add it in the tour
                      </GTags.Txt>
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
                        {paginatedScreensNotPartOfTour.map(screen => (
                          <ScreenCard screen={screen} handleAddScreen={this.handleAddScreenNotPartOfTour} key={screen.id} />
                        ))}
                      </Tags.ScreenPicker>
                      {this.shouldShowPaginationOption(paginatedScreensNotPartOfTour) && (
                        <Tags.PaginationButton type="primary" onClick={this.handleLoadMoreScreens}>
                          <GTags.Txt className="title">Load more screens</GTags.Txt>
                        </Tags.PaginationButton>
                      )}
                      {this.shouldShowPaginationOption(paginatedScreensNotPartOfTour) && (
                        <Tags.Blur />
                      )}
                    </>
                  ) : (
                    <>
                      {this.state.screenLoading
                        ? (
                          <div style={{ height: '40px' }}>
                            <Loader width="100px" />
                          </div>
                        )
                        : (
                          <p>
                            <GTags.Txt>
                              All captured screens are already part of this tour. Any new screen captured will be available here.
                            </GTags.Txt>
                          </p>
                        )}
                      <Tags.Screen
                        onClick={() => {
                          this.setState({ showUploadScreenImgModal: true });
                        }}
                        style={{ border: '1px dashed #E0E0E0' }}
                      >
                        <Tags.UploadImgCont>
                          <UploadOutlined style={{ fontSize: '3rem', color: '#7567ff' }} />
                          <GTags.Txt className="title2">Upload screen image</GTags.Txt>
                        </Tags.UploadImgCont>
                      </Tags.Screen>
                    </>
                  )}
                </Tags.ScreenTab>
              )
            }, {
              key: 'screens-part-of-tour',
              label: 'Screens part of tour',
              children: (
                <Tags.ScreenTab>
                  {this.state.screensPartOfTour.length > 0 && (
                    <>
                      <GTags.Txt
                        className="title"
                        style={{ marginBottom: '0.5rem' }}
                      >Current tour screens
                      </GTags.Txt>
                      <Tags.ScreenPicker>
                        {this.state.screensPartOfTour.map(screen => (
                          <ScreenCard screen={screen} handleAddScreen={this.handleAddScreenPartOfTour} key={screen.id} />
                        ))}
                      </Tags.ScreenPicker>
                    </>
                  )}
                </Tags.ScreenTab>
              )
            },
            ]}
          />
        </Tags.ScreenPickerContainer>
        {
          this.state.showUploadScreenImgModal && (
            <UploadImageScreen
              open={this.state.showUploadScreenImgModal}
              closeModal={() => this.setState({ showUploadScreenImgModal: false })}
              tourRid={this.props.tour!.rid}
              handleAddScreen={() => this.props.getAllScreens()}
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
