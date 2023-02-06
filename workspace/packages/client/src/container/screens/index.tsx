import { LoadingStatus } from '@fable/common/dist/types';
import Popover from 'antd/lib/popover';
import Modal from 'antd/lib/modal';
import React from 'react';
import { connect } from 'react-redux';
import Space from 'antd/lib/space';
import { CaretDownFilled, AppstoreOutlined, MenuOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import { copyScreenForCurrentTour, getAllScreens, renameScreen } from '../../action/creator';
import linkOpenIcon from '../../assets/link.svg';
import tourIcon from '../../assets/tours-icon-dark.svg';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import SidePanel from '../../component/side-panel';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import * as Tags from './styled';
import Loader from '../../component/loader';
import EmptyScreenIllustration from '../../assets/empty-screens-illustration.svg';

interface IDispatchProps {
  getAllScreens: () => void;
  renameScreen: (screen: P_RespScreen, newVal: string) => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  getAllScreens: () => dispatch(getAllScreens()),
  copyScreenForCurrentTour:
    (tour: P_RespTour, screen: P_RespScreen) => dispatch(copyScreenForCurrentTour(tour, screen)),
  renameScreen: (screen: P_RespScreen, newVal: string) => dispatch(renameScreen(screen, newVal)),
});

interface IAppStateProps {
  screens: P_RespScreen[];
  loadingStatus: LoadingStatus;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  screens: state.default.allScreens,
  loadingStatus: state.default.allScreensLoadingStatus,
});

interface IOwnProps {}
type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenId: string;
  }>;

interface IOwnStateProps {
  showModal: boolean;
  selectedScreen: P_RespScreen | null,
  selectedScreenName: string
}

class Screens extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = { showModal: false, selectedScreen: null, selectedScreenName: '' };
  }

  componentDidMount(): void {
    this.props.getAllScreens();
  }

  handleRenameScreenFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    this.handleModalOk();
  };

  handleShowModal = (e: React.MouseEvent<HTMLDivElement>, screen: P_RespScreen) => {
    e.stopPropagation();
    e.preventDefault();
    this.setState({ showModal: true, selectedScreen: screen, selectedScreenName: screen.displayName });
  };

  handleModalOk = () => {
    const newVal = this.state.selectedScreenName.replace(/\s+/, ' ').trim().toLowerCase();
    if (newVal === this.state.selectedScreen!.displayName.toLowerCase()) {
      return;
    }
    this.props.renameScreen(this.state.selectedScreen!, newVal);
    this.state.selectedScreen!.displayName = newVal;
    this.setState({ showModal: false, selectedScreen: null, selectedScreenName: '' });
  };

  handleModalCancel = () => {
    this.setState({ showModal: false, selectedScreen: null, selectedScreenName: '' });
  };

  render() {
    const hasScreen = this.props.screens.length > 0;
    const isLoaded = this.props.loadingStatus === LoadingStatus.Done;

    return (
      <GTags.RowCon className="screen-con">
        <GTags.SidePanelCon>
          <SidePanel selected="screens" />
        </GTags.SidePanelCon>
        <GTags.MainCon>
          <GTags.HeaderCon>
            <Header rBtnTxt="Record a screen" />
          </GTags.HeaderCon>
          <GTags.BodyCon
            style={{
              minHeight: hasScreen ? '' : 'calc(100vh - 72px)',
              alignItems: 'unset',
              display: !hasScreen ? 'block' : 'flex',
              position: 'relative',
              height: '100%',
            }}
            className={hasScreen ? '' : 'centered'}
          >
            {isLoaded && hasScreen ? (
              <>
                <Tags.TopCon>
                  <Tags.TxtCon>
                    <GTags.Txt className="head">All screens</GTags.Txt>
                    <GTags.Txt className="subhead">
                      Screens are like interactive snapshot of your product that you record from Fable's extension. You
                      can edit a screen, annotate part of the screen and stitch multiple screens to create guided
                      tour of your product.
                    </GTags.Txt>
                  </Tags.TxtCon>
                </Tags.TopCon>
                <Tags.ScreenCardsCon>
                  {this.props.screens.map((screen, i) => (
                    <Tags.CardCon
                      key={screen.rid}
                      to={!screen.isRootScreen ? `/tour/${screen.tour?.rid}/${screen.rid}` : `/screen/${screen.rid}`}
                    >
                      <Tags.CardImg src={screen.thumbnailUri.href} />
                      <Tags.CardFlexColCon style={{ marginTop: '0.35rem' }}>
                        <Tags.CardFlexRowCon>
                          {screen.icon && <Tags.CardIconMd src={screen.icon} alt="screen icon" />}
                          <GTags.Txt className="title oneline" title={screen.displayName}>
                            {screen.displayName}
                          </GTags.Txt>
                          <Popover
                            content={
                              <GTags.PopoverMenuItem onClick={e => this.handleShowModal(e, screen)}>
                                Rename Screen
                              </GTags.PopoverMenuItem>
                            }
                            trigger="hover"
                            placement="right"
                          >
                            <MenuOutlined
                              style={{ color: '#bdbdbd', marginLeft: '0.75rem' }}
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            />
                          </Popover>
                        </Tags.CardFlexRowCon>
                        <Tags.CardFlexRowCon>
                          <Tags.CardIconSm src={linkOpenIcon} alt="screen icon" />
                          <GTags.Txt className="link faded" title={screen.url}>
                            {screen.urlStructured.hostname}
                          </GTags.Txt>
                        </Tags.CardFlexRowCon>
                        <Tags.CardFlexRowCon style={{ alignItems: 'center' }}>
                          { !screen.isRootScreen && (<Tags.CardIconMd src={tourIcon} alt="screen icon" />)}
                          <GTags.Txt className="faded">
                            {screen.isRootScreen
                              ? 'Recorded screen from extension'
                              : (<>Used in <em>{screen.tour?.displayName}</em> tour</>)}
                          </GTags.Txt>
                        </Tags.CardFlexRowCon>
                        <Tags.CardFlexRowCon style={{ justifyContent: 'space-between' }}>
                          <GTags.Txt>Edited {screen.displayableUpdatedAt}</GTags.Txt>
                          <Tags.CardIconLg src="https://avatars.dicebear.com/api/adventurer/tris.svg" />
                        </Tags.CardFlexRowCon>
                      </Tags.CardFlexColCon>
                    </Tags.CardCon>
                  ))}
                </Tags.ScreenCardsCon>
              </>
            ) : (
              !isLoaded ? (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <Loader
                    width="240px"
                  />
                </div>
              ) : (
                <Tags.NoScreenMsgCon>
                  <Tags.TxtCon>
                    <GTags.Txt className="head">All screens</GTags.Txt>
                    <GTags.Txt className="subhead">
                      Screens are like interactive snapshot of your product that you record from Fable's extension. You
                      can edit a screen, annotate part of the screen and stitch multiple screens to create guided tour
                      of your product.
                    </GTags.Txt>
                  </Tags.TxtCon>
                  <Tags.ScreenEmptyCon>
                    <img
                      src={EmptyScreenIllustration}
                      alt="Illustration"
                    />
                    <GTags.Txt className="head">Record a new screen to get started with editing</GTags.Txt>
                    <GTags.Txt className="subhead">
                      You can use our chrome extension to record interactive version of your product.
                      All your screens from product would appear here.
                    </GTags.Txt>
                    <Tags.EditScreenBtn>
                      Download Fable Extension
                    </Tags.EditScreenBtn>
                  </Tags.ScreenEmptyCon>
                </Tags.NoScreenMsgCon>
              )
            )}
          </GTags.BodyCon>
        </GTags.MainCon>
        <Modal
          title="Rename Screen"
          open={this.state.showModal}
          onOk={this.handleModalOk}
          onCancel={this.handleModalCancel}
        >
          <form onSubmit={this.handleRenameScreenFormSubmit}>
            <label htmlFor="renameScreen">
              What would you like to rename the selected screen?
              <input
                id="renameScreen"
                style={{
                  padding: '0.5rem 1rem',
                  marginTop: '0.75rem',
                  fontSize: '1rem',
                  borderRadius: '8px',
                  width: 'calc(100% - 2rem)'
                }}
                value={this.state.selectedScreenName}
                onChange={e => this.setState({ selectedScreenName: e.target.value })}
              />
            </label>
          </form>
        </Modal>
      </GTags.RowCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Screens));
