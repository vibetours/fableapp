import React from 'react';
import { connect } from 'react-redux';
import Modal from 'antd/lib/modal';
import { PlusOutlined, EditFilled, DownOutlined, SearchOutlined } from '@ant-design/icons';
import Input from 'antd/lib/input';
import AutoComplete from 'antd/lib/auto-complete';
import HeartLoader from '../../component/loader/heart';
import { saveAsTour, saveScreens } from './utils';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import { DBData, ModalTab, ScreenInfo } from './types';
import { deleteDataFromDb, getDataFromDb, openDb } from './db-utils';
import * as Tags from './styled';
import BackgroundImg from '../../assets/create-tour-bg.svg';
import { getAllTours } from '../../action/creator';
import { P_RespTour } from '../../entity-processor';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import { DB_NAME, OBJECT_STORE, OBJECT_KEY, OBJECT_KEY_VALUE } from './constants';

interface IDispatchProps {
  getAllTours: () => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  getAllTours: () => dispatch(getAllTours(false)),
});

interface IAppStateProps {
  tours: P_RespTour[];
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tours: state.default.tours,
});

interface IOwnProps { }

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenId: string;
    annotationId?: string;
  }>;

type IOwnStateProps = {
  loading: boolean;
  showSaveModal: boolean;
  saving: boolean;
  notDataFound: boolean;
  modalTab: ModalTab;
  tourName: string;
  showExistingTours: boolean;
  options: {
    value: string,
    label: JSX.Element
  }[];
  isReadyToSave: boolean,
  isScreenProcessed: boolean,
  saveType: 'new_tour' | 'existing_tour' | null,
  existingTourId: string | null,
}

class CreateTour extends React.PureComponent<IProps, IOwnStateProps> {
  private data: DBData | null;

  private db: IDBDatabase | null;

  private screens: ScreenInfo[];

  private nameTourRef = React.createRef<HTMLInputElement>();

  constructor(props: IProps) {
    super(props);
    this.state = {
      loading: true,
      showSaveModal: false,
      saving: false,
      notDataFound: false,
      modalTab: ModalTab.INIT,
      tourName: 'Untitled',
      showExistingTours: false,
      options: [],
      isReadyToSave: false,
      isScreenProcessed: false,
      saveType: null,
      existingTourId: null
    };
    this.data = null;
    this.db = null;
    this.screens = [];
  }

  async initDbOperations() {
    this.db = await openDb(DB_NAME, OBJECT_STORE, 1, OBJECT_KEY);
    const dbData = await getDataFromDb(this.db, OBJECT_STORE, OBJECT_KEY_VALUE) as DBData;
    if (dbData) {
      this.data = dbData;
      this.setState({ loading: false, showSaveModal: true });
      this.processScreens();
      return;
    }
    this.setState({ loading: false, notDataFound: true });
  }

  processScreens = async () => {
    if (!this.data) {
      return;
    }

    this.screens = await saveScreens(
      JSON.parse(this.data.screensData),
      JSON.parse(this.data.cookies),
    );
    this.setState({ isScreenProcessed: true });
  };

  createNewTour = () => {
    this.setState({ saveType: 'new_tour', isReadyToSave: true, saving: true, showSaveModal: false });
  };

  saveTour = async () => {
    if (!this.db) {
      return;
    }
    this.setState({ saving: true, showSaveModal: false });
    const tour = await saveAsTour(
      this.screens,
      null,
      this.state.tourName
    );
    await deleteDataFromDb(this.db, OBJECT_STORE, OBJECT_KEY_VALUE);
    this.props.navigate(`/tour/${tour.data.rid}`);
  };

  saveInExistingTour = async (value: string | null) => {
    if (!this.data || !this.db || !value) {
      return;
    }
    const existingTour = this.props.tours.filter(el => el.rid === value)[0];
    this.setState({ saving: true, showSaveModal: false, tourName: existingTour.displayName });
    const tour = await saveAsTour(
      this.screens,
      existingTour
    );
    await deleteDataFromDb(this.db, OBJECT_STORE, OBJECT_KEY_VALUE);
    this.props.navigate(`/tour/${tour.data.rid}`);
  };

  hideModal = () => {
    this.setState({ showSaveModal: false });
  };

  static generateOptionsCard = (options: P_RespTour[]) => options.map(el => ({
    value: el.rid,
    label: (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
        key={Math.random()}
      >
        <span>
          {el.displayName}
        </span>
      </div>
    ),
  }));

  handleSearch = (value: string) => {
    const filteredOptions = this.props.tours
      .filter(tour => tour.displayName.toLocaleLowerCase().includes(value.toLowerCase()));
    this.setState({ options: CreateTour.generateOptionsCard(filteredOptions) });
  };

  componentDidMount() {
    this.setState({ loading: true });
    this.props.getAllTours();
    this.initDbOperations();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (prevProps.tours !== this.props.tours) {
      this.setState({ options: CreateTour.generateOptionsCard(this.props.tours) });
    }

    if (prevState.isReadyToSave !== this.state.isReadyToSave
      || prevState.isScreenProcessed !== this.state.isScreenProcessed) {
      if (this.state.isReadyToSave && this.state.isScreenProcessed) {
        if (this.state.saveType === 'new_tour') {
          this.saveTour();
        }

        if (this.state.saveType === 'existing_tour') {
          this.saveInExistingTour(this.state.existingTourId);
        }
      }
    }

    if (prevState.modalTab !== this.state.modalTab) {
      if (this.state.modalTab === ModalTab.CREATE_TOUR) {
        this.nameTourRef.current?.focus();
        this.nameTourRef.current?.select();
      }
    }
  }

  componentWillUnmount(): void {
    this.db?.close();
  }

  render() {
    if (this.state.loading) {
      return (
        <HeartLoader />
      );
    }

    return (
      <>
        <GTags.HeaderCon>
          <Header rBtnTxt="Record a screen" />
        </GTags.HeaderCon>
        {
          this.state.saving && <Tags.TourHeading>{this.state.tourName}</Tags.TourHeading>
        }
        <Tags.Container>
          <Tags.Heading>
            {this.state.notDataFound && 'No data found' }
          </Tags.Heading>
          <img src={BackgroundImg} alt="" />
          {
          this.state.saving && (
            <Tags.LoadingToast>
              Loading... It might take a few seconds
            </Tags.LoadingToast>
          )
        }
          <Modal
            open={this.state.showSaveModal}
            title=""
            onCancel={this.hideModal}
            footer={null}
            style={{ position: 'relative' }}
          >
            <Tags.ModalBorderTop>
              <div />
              <div />
              <div />
            </Tags.ModalBorderTop>
            <Tags.ModalContainer>
              {
            this.state.modalTab === ModalTab.INIT && (
              <div>
                <Tags.PrimaryModalButton
                  onClick={() => this.setState({ modalTab: ModalTab.CREATE_TOUR })}
                >
                  <PlusOutlined /> <span>Create a new tour</span>
                </Tags.PrimaryModalButton>
                <Tags.SecondaryModalButton
                  onClick={() => this.setState({ showExistingTours: true })}
                >
                  <span>Save in existing tour</span> <DownOutlined />
                </Tags.SecondaryModalButton>

                {
                  this.state.showExistingTours && (
                    <Tags.SearchInputContainer>
                      <Tags.SearchInputWrapper>
                        <AutoComplete
                          dropdownMatchSelectWidth={252}
                          style={{ width: '100%' }}
                          options={this.state.options}
                          onSelect={(value: string) => this.setState({
                            existingTourId: value,
                            isReadyToSave: true,
                            saveType: 'existing_tour',
                            saving: true,
                            showSaveModal: false
                          })}
                          onSearch={this.handleSearch}
                          placeholder="Type to search"
                        >
                          <input type="text" />
                        </AutoComplete>
                        <SearchOutlined
                          style={{ position: 'absolute', top: '10px', left: '15px' }}
                        />
                      </Tags.SearchInputWrapper>
                    </Tags.SearchInputContainer>
                  )
                }

              </div>
            )
          }
              {
            this.state.modalTab === ModalTab.CREATE_TOUR && (
              <div>
                <Tags.InputLabel htmlFor="tour-name">Name your tour</Tags.InputLabel>
                <Tags.NameTourInputContainer>
                  <input
                    id="tour-name"
                    placeholder="Untitled"
                    value={this.state.tourName}
                    onChange={(e) => this.setState({ tourName: e.target.value })}
                    ref={this.nameTourRef}
                  />
                  <EditFilled style={{ position: 'absolute', top: '0.875rem', left: '0.875rem' }} />
                </Tags.NameTourInputContainer>
                <Tags.ModalButtonsContainer>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => this.setState({ showSaveModal: false })}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="primary"
                    onClick={this.createNewTour}
                    disabled={this.state.saving}
                  >
                    Save
                  </button>
                </Tags.ModalButtonsContainer>
              </div>
            )
          }
            </Tags.ModalContainer>
          </Modal>

        </Tags.Container>
      </>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(CreateTour));
