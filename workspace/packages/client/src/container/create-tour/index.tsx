import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import HeartLoader from '../../component/loader/heart';
import { saveAsTour } from './utils';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import { DBData } from './types';
import { deleteDataFromDb, getDataFromDb, openDb, putDataInDb } from './db-utils';

interface IDispatchProps {
}

const mapDispatchToProps = () => ({});

interface IAppStateProps {
}

const mapStateToProps = () => ({});

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
}

class CreateTour extends React.PureComponent<IProps, IOwnStateProps> {
  private DB_NAME: string;

  private OBJECT_STORE: string;

  private OBJECT_KEY: string;

  private OBJECT_KEY_VALUE: string;

  private data: DBData | null;

  private db: IDBDatabase | null;

  constructor(props: IProps) {
    super(props);
    this.state = { loading: true, showSaveModal: false, saving: false };
    this.DB_NAME = 'screensDB';
    this.OBJECT_STORE = 'screensDataStore';
    this.OBJECT_KEY = 'id';
    this.OBJECT_KEY_VALUE = '1';
    this.data = null;
    this.db = null;
  }

  async initDbOperations() {
    this.db = await openDb(this.DB_NAME, this.OBJECT_STORE, 1, this.OBJECT_KEY);
    const dbData = await getDataFromDb(this.db, this.OBJECT_STORE, this.OBJECT_KEY_VALUE) as DBData;
    if (dbData) {
      this.data = dbData;
      this.setState({ loading: false, showSaveModal: true });
      return;
    }
    this.waitForScreensData();
  }

  saveTour = async () => {
    if (!this.data || !this.db) {
      return;
    }
    this.setState({ saving: true });
    const tour = await saveAsTour(JSON.parse(this.data.screensData), JSON.parse(this.data.cookies));
    await deleteDataFromDb(this.db, this.OBJECT_STORE, this.OBJECT_KEY_VALUE);
    this.props.navigate(`/tour/${tour.data.rid}`);
  };

  waitForScreensData() {
    const intervalId = setInterval(async () => {
      const el = document.querySelector('#exchange-data') as HTMLElement;
      const cookiesEl = document.querySelector('#cookies-data') as HTMLElement;
      if (el && cookiesEl) {
        clearInterval(intervalId);
        const screensData = el.textContent;
        const cookies = cookiesEl.textContent || '';
        if (!screensData) {
          return;
        }

        this.data = {
          id: '1',
          screensData,
          cookies
        };

        if (this.db) {
          await putDataInDb(this.db, this.OBJECT_STORE, this.data);
          this.data = await getDataFromDb(this.db, this.OBJECT_STORE, this.OBJECT_KEY_VALUE) as DBData;
          this.saveTour();
        }
      }
    }, 300);
  }

  componentDidMount() {
    this.setState({ loading: true });
    this.initDbOperations();
  }

  render() {
    if (this.state.loading) {
      return (
        <HeartLoader />
      );
    }

    return (
      <div>
        <h1>Tour created!</h1>
        {
            this.state.showSaveModal && (
            <div>
              <p>Do you want to save the data?</p>
              <button
                type="button"
                onClick={this.saveTour}
                disabled={this.state.saving}
              >
                {this.state.saving ? 'Saving' : 'Save'}
              </button>
            </div>
            )
          }
      </div>

    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(CreateTour));
