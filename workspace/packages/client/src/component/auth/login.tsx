import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useSearchParams } from 'react-router-dom';
import Loader from '../loader';
import InfoCon, { InfoBtn } from '../info-con';

interface Props {
  title: string,
}

export const enum LoginErrorType {
  UserUsedPersonalEmail = '1',
}

export default function LogIn(props: Props): JSX.Element {
  const [searchParams] = useSearchParams();
  const { loginWithRedirect } = useAuth0();

  const [msg, setMsg] = useState(<></>);
  const [heading, setHeading] = useState('');
  const [btns, setBtns] = useState<Array<InfoBtn>>([]);

  if (searchParams.get('redirect')) {
    localStorage.setItem('redirect', searchParams.get('redirect')!);
  }

  useEffect(() => {
    document.title = props.title;

    const errorType = searchParams.get('t');
    if (!errorType) {
      setHeading('');
      setMsg(
        <Loader width="120px" />
      );
      setBtns([]);
      loginWithRedirect();
    } else if (errorType === LoginErrorType.UserUsedPersonalEmail) {
      // if redirection to login page happened because of an application handled error
      // like user loggedin from personal page
      //
      const emailUsedDuringLogin = decodeURIComponent(searchParams.get('e') || '');
      setHeading('Personal email id not allowed!');
      setMsg(
        <p>
          You have used <em>{emailUsedDuringLogin}</em> email id to login. This seems to be a personal email id. <em>Please use work email id to login.</em>
        </p>
      );
      setBtns([{
        type: 'primary',
        text: 'Login using work email',
        linkTo: '/login'
      }]);
    }
  }, [searchParams]);

  return (
    <div>
      <InfoCon
        heading={heading}
        body={msg}
        btns={btns}
      />
    </div>
  );
}
