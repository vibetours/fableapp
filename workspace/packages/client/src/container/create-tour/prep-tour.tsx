import React from 'react';
import { connect } from 'react-redux';
import { startTransaction, captureException } from '@sentry/react';
import { sentryTxReport } from '@fable/common/dist/sentry';
import { Progress } from 'antd';
import HeartLoader from '../../component/loader/heart';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import { DBData } from './types';
import { getDataFromDb, openDb, putDataInDb } from './db-utils';
import { DB_NAME, OBJECT_STORE, OBJECT_KEY, OBJECT_KEY_VALUE } from './constants';
import * as Tags from './styled';

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
  progressPercent: number;
}

class PrepTour extends React.PureComponent<IProps, IOwnStateProps> {
  private data: DBData | null;

  private db: IDBDatabase | null;

  constructor(props: IProps) {
    super(props);
    this.state = { loading: true, progressPercent: 0 };
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
      const totalScreenCountEl = document.querySelector('#total-screen-count') as HTMLElement;
      const numberOfScreensReceivedCountEl = document.querySelector('#number-of-screens-received-count') as HTMLElement;
      const styleDataEl = document.querySelector('#screen-style-data') as HTMLElement;

      if (totalScreenCountEl && numberOfScreensReceivedCountEl) {
        const totalScreenCount = +totalScreenCountEl.textContent! || 1;
        const numberOfScreensReceivedCount = +numberOfScreensReceivedCountEl.textContent! || 0;
        const progressPercent = Math.round((numberOfScreensReceivedCount / totalScreenCount) * 100);
        this.setState({ progressPercent });
      }

      if (el && cookiesEl) {
        clearInterval(intervalId);
        const screensData = el.textContent;
        const cookies = cookiesEl.textContent || '';

        let screenStyleData = '';
        if (styleDataEl && styleDataEl.textContent) {
          screenStyleData = styleDataEl.textContent;
        }

        if (!screensData) {
          return;
        }

        this.data = {
          id: OBJECT_KEY_VALUE,
          screensData,
          cookies,
          screenStyleData
        };

        if (this.db) {
          const transaction = startTransaction({ name: 'saveTourDataToIndexedDB' });
          await putDataInDb(this.db, OBJECT_STORE, this.data);
          sentryTxReport(transaction, 'screenscount', JSON.parse(screensData).length, 'byte');
          const dbData = await getDataFromDb(this.db, OBJECT_STORE, OBJECT_KEY_VALUE) as DBData;
          if (!dbData) {
            captureException('Data not stored in indexedDB');
          }
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
        <Tags.HeartLoaderCon>
          <HeartLoader />
          <Progress strokeColor="#7567ff" status="active" percent={this.state.progressPercent} />
        </Tags.HeartLoaderCon>
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
