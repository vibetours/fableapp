import React from 'react';
import { connect } from 'react-redux';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { DB_NAME, OBJECT_STORE, OBJECT_KEY, OBJECT_KEY_VALUE } from '../create-tour/constants';
import { getDataFromDb, openDb } from '../create-tour/db-utils';
import { DBData } from '../create-tour/types';
import TopLoader from '../../component/loader/top-loader';
import { TOP_LOADER_DURATION } from '../../constants';

interface IDispatchProps {
}

const mapDispatchToProps = (dispatch: any) => ({
});

interface IAppStateProps { }

const mapStateToProps = (state: TState): IAppStateProps => ({ });

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps;

interface IOwnStateProps {
}

class AuthCallback extends React.PureComponent<IProps, IOwnStateProps> {
  private db: IDBDatabase | null;

  constructor(props: IProps) {
    super(props);
    this.db = null;
  }

  componentDidMount(): void {
    setTimeout(async () => {
      this.db = await openDb(DB_NAME, OBJECT_STORE, 1, OBJECT_KEY);
      const dbData = await getDataFromDb(this.db, OBJECT_STORE, OBJECT_KEY_VALUE) as DBData;
      if (dbData) {
        this.props.navigate('/create-interactive-demo');
      }
      this.props.navigate('/demos');
    }, 2000);
  }

  render(): React.ReactNode {
    return (
      <div><TopLoader duration={TOP_LOADER_DURATION} showLogo /></div>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(AuthCallback));
