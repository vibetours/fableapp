import React from 'react';
import { connect } from 'react-redux';
import { ScreenType } from '@fable/common/dist/api-contract';
import { FileImageOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import { AddScreenToTour, AnnAdd, addScreenToTour, getAllScreens } from '../../action/creator';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { AnnotationPerScreen } from '../../types';

import * as GTags from '../../common-styled';
import * as Tags from './styled';
import { getAnnotationsPerScreen } from '../../utils';
import UploadImageScreen from './upload-image-screen';
import { ScreenSliderMode } from '../../component/timeline/types';

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
    isOpenScreenSlider: boolean;
    hideScreenSlider: () => void;
    screenSliderMode: ScreenSliderMode;
    addAnnotationData?: AnnAdd;
    addCoverAnnToScreen?: (screenId: number) => void;
    hidePopup?: () => void;
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
}

class ScreenSlider2 extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      screensNotPartOfTour: [],
      screensPartOfTour: [],
      showUploadScreenImgModal: false,
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

  handleAddScreenPartOfTour = (screenId: number, screenRid: string): void => {
    if (this.props.screenSliderMode === 'create') {
      this.props.addCoverAnnToScreen!(screenId);

      // TODO[rrl] do this once api endpoint is completed
      setTimeout(() => {
        this.props.hideScreenSlider();
        this.props.hidePopup!();
      }, 1000);
    } else {
      const url = `/tour/${this.props.tour!.rid}/${screenRid}`;
      this.props.navigate(url);
    }
  };

  handleAddScreenNotPartOfTour = (screen: P_RespScreen): void => {
    if (this.props.screenSliderMode === 'create') {
      this.props.addScreenToTour(
        screen,
        this.props.tour!.rid,
        false,
        this.props.addAnnotationData!
      );

      // TODO[rrl] do this once api endpoint is completed
      setTimeout(() => {
        this.props.hideScreenSlider();
        this.props.hidePopup!();
      }, 1000);
    } else {
      this.props.addScreenToTour(
        screen,
        this.props.tour!.rid,
        true,
      );
    }
  };

  render(): JSX.Element {
    return (
      <>
        {
          this.props.isOpenScreenSlider && (
            <Tags.SelectScreenContainer screenSliderMode={this.props.screenSliderMode}>
              <Tags.ScreensContainer>
                {this.state.screensPartOfTour.length > 0 && (
                <>
                  <GTags.Txt
                    className="title"
                    style={{ marginBottom: '0.5rem' }}
                  >Current tour screens
                  </GTags.Txt>
                  <Tags.ScreenSlider style={{ flexDirection: 'column', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                      {this.state.screensPartOfTour.map(screen => (
                        <Tags.Screen
                          key={screen.id}
                          onClick={() => {
                            this.handleAddScreenPartOfTour(screen.id, screen.rid);
                          }}
                        >
                          <img src={screen.thumbnailUri.href} alt={screen.displayName} />
                          <Tags.ScreenTitleIconCon>
                            <GTags.Txt className="title2">{screen.displayName}</GTags.Txt>
                            <div>
                              {
                              screen.type === ScreenType.SerDom ? <FileTextOutlined /> : <FileImageOutlined />
                            }
                            </div>
                          </Tags.ScreenTitleIconCon>
                        </Tags.Screen>
                      ))}
                    </div>
                    <div />
                  </Tags.ScreenSlider>
                </>
                )}
                {this.state.screensNotPartOfTour.length > 0 ? (
                  <>
                    <GTags.Txt
                      className="title"
                      style={{ marginBottom: '0.5rem' }}
                    >Select a screen to add it in the tour
                    </GTags.Txt>
                    <Tags.ScreenSlider style={{ flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: '1.25rem' }}>
                        <Tags.Screen onClick={() => {
                          this.props.hideScreenSlider();
                          this.setState({ showUploadScreenImgModal: true });
                        }}
                        >
                          <Tags.UploadImgCont>
                            <UploadOutlined style={{ fontSize: '3rem' }} />
                            <GTags.Txt className="title2">Upload screen image</GTags.Txt>
                          </Tags.UploadImgCont>
                        </Tags.Screen>
                        {this.state.screensNotPartOfTour.map(screen => (
                          <Tags.Screen
                            key={screen.id}
                            onClick={() => {
                              this.handleAddScreenNotPartOfTour(screen);
                            }}
                          >
                            <img src={screen.thumbnailUri.href} alt={screen.displayName} />
                            <Tags.ScreenTitleIconCon>
                              <GTags.Txt className="title2">{screen.displayName}</GTags.Txt>
                              <div>
                                {
                              screen.type === ScreenType.SerDom ? <FileTextOutlined /> : <FileImageOutlined />
                            }
                              </div>
                            </Tags.ScreenTitleIconCon>
                          </Tags.Screen>
                        ))}
                      </div>
                      <div />
                    </Tags.ScreenSlider>
                  </>
                ) : (
                  <>
                    <GTags.Txt>
                      All captured screens are already part of this tour.
                      <br />
                      Any new screen captured will be available here.
                    </GTags.Txt>
                    <Tags.Screen
                      onClick={() => {
                        this.props.hideScreenSlider();
                        this.setState({ showUploadScreenImgModal: true });
                      }}
                      style={{ margin: '1rem auto' }}
                    >
                      <Tags.UploadImgCont>
                        <UploadOutlined style={{ fontSize: '3rem' }} />
                        <GTags.Txt className="title2">Upload screen image</GTags.Txt>
                      </Tags.UploadImgCont>
                    </Tags.Screen>
                  </>

                )}
              </Tags.ScreensContainer>
            </Tags.SelectScreenContainer>
          )
        }
        {
        this.state.showUploadScreenImgModal && (
          <UploadImageScreen
            open={this.state.showUploadScreenImgModal}
            closeModal={() => this.setState({ showUploadScreenImgModal: false })}
            tourRid={this.props.tour!.rid}
            handleAddScreen={this.handleAddScreenNotPartOfTour}
            hidePopup={() => {
              if (this.props.screenSliderMode === 'create') {
                this.props.hidePopup!();
              }
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
)(withRouter(ScreenSlider2));
