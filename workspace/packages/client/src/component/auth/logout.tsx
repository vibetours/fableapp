import { useAuth0 } from '@auth0/auth0-react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LogoutType } from '@fable/common/dist/constants';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import Loader from '../loader';
import InfoCon, { InfoBtn } from '../info-con';
import FullPageTopLoader from '../loader/full-page-top-loader';

interface Props {
  title: string,
}

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

export default function Logout(props: Props): JSX.Element {
  const [searchParams] = useSearchParams();
  const { logout } = useAuth0();
  const [msg, setMsg] = useState(<></>);
  const [heading, setHeading] = useState('');
  const [btns, setBtns] = useState<Array<InfoBtn>>([]);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    document.title = props.title;

    const logoutTypeRaw = searchParams.get('t');
    let logoutType = 0;
    if (logoutTypeRaw) logoutType = +logoutTypeRaw;
    switch (logoutType) {
      case LogoutType.AccessTokenInvalidated:
        setHeading('Insufficient permission');
        setMsg(
          <>
            <p>
              Your session has expired. Please login again to continue.
            </p>
            <p>
              <em>This might happen due to a long period of inactivity.</em>
            </p>
          </>
        );
        setShowLoader(false);
        setBtns([{
          type: 'primary',
          text: 'Logout',
          linkTo: '/logout'
        }]);
        raiseDeferredError(new Error(`Forced user to logout page for logoutType=${logoutType}`));
        break;

      case LogoutType.APINotAutorized:
        setHeading('Insufficient permission');
        setMsg(
          <p>
            Either your session has expired or you don't have access to requested resource. Please login using correct account.
          </p>
        );
        setShowLoader(false);
        setBtns([{
          type: 'primary',
          text: 'Logout',
          linkTo: '/logout'
        }, {
          type: 'secondary',
          text: 'See all demos',
          linkTo: '/demos'
        }]);
        raiseDeferredError(new Error(`Forced user to logout page for logoutType=${logoutType}`));
        break;

      default:
        setHeading('Logging out...');
        setMsg(
          <Loader width="120px" />
        );
        setBtns([]);
        setShowLoader(true);
        setTimeout(() => {
          logout({ logoutParams: { returnTo: `${APP_CLIENT_ENDPOINT}/login` } });
        }, 1500);

        break;
    }
  }, [searchParams]);

  return (
    <div>
      {
        showLoader
          ? <FullPageTopLoader showLogo text="Logging out" />
          : <InfoCon
              heading={heading}
              body={msg}
              btns={btns}
          />
      }
    </div>
  );
}
