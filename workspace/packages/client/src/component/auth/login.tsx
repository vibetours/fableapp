import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useSearchParams } from 'react-router-dom';
import InfoCon, { InfoBtn } from '../info-con';
import FullPageTopLoader from '../loader/full-page-top-loader';

interface Props {
  title: string,
}

export const enum LoginErrorType {
  UserUsedPersonalEmail = '1',
}

export default function LogIn(props: Props): JSX.Element {
  const [searchParams] = useSearchParams();
  const { loginWithRedirect } = useAuth0();

  const [heading, setHeading] = useState('');
  const [btns, setBtns] = useState<Array<InfoBtn>>([]);
  const [showLoader, setShowLoader] = useState(false);

  if (searchParams.get('redirect')) {
    localStorage.setItem('redirect', searchParams.get('redirect')!);
  }

  useEffect(() => {
    document.title = props.title;

    const errorType = searchParams.get('t');
    if (!errorType) {
      setHeading('');
      setBtns([]);
      setShowLoader(true);
      loginWithRedirect();
    }
  }, [searchParams]);

  return (
    <div>
      {showLoader
        ? <FullPageTopLoader showLogo text="Logging in" />
        : <InfoCon
            heading={heading}
            body=""
            btns={btns}
        />}
    </div>
  );
}
