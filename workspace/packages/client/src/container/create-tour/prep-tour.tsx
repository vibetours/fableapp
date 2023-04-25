import React from 'react';
import { connect } from 'react-redux';
import HeartLoader from '../../component/loader/heart';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import { DBData } from './types';
import { openDb, putDataInDb } from './db-utils';
import { DB_NAME, OBJECT_STORE, OBJECT_KEY, OBJECT_KEY_VALUE } from './constants';

interface IDispatchProps {
}

const mapDispatchToProps = () => ({});

interface IAppStateProps {
}

const mapStateToProps = () => ({});

interface IOwnProps {
  title: string;
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
  loading: boolean;
}

class PrepTour extends React.PureComponent<IProps, IOwnStateProps> {
  private data: DBData | null;

  private db: IDBDatabase | null;

  constructor(props: IProps) {
    super(props);
    this.state = { loading: true };
    this.data = null;
    this.db = null;
  }

  async initDbOperations() {
    this.db = await openDb(DB_NAME, OBJECT_STORE, 1, OBJECT_KEY);
    this.waitForScreensData();
  }

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
          id: OBJECT_KEY_VALUE,
          screensData,
          cookies
        };

        if (this.db) {
          await putDataInDb(this.db, OBJECT_STORE, this.data);
          this.db.close();
          setTimeout(() => {
            window.location.replace('/createtour');
          }, 500);
        }
      }
    }, 300);
  }

  componentDidMount() {
    document.title = this.props.title;
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
        <h1>Tour prepped!</h1>
      </div>

    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PrepTour));
