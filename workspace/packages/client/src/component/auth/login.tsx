import React, { useEffect, useState } from 'react';
import Button from 'antd/lib/button';
import { useAuth0 } from '@auth0/auth0-react';
import { useSearchParams } from 'react-router-dom';
import Loader from '../loader';
import Btn from '../btn';

interface Props {
  title: string,
}

export const enum LoginErrorType {
  UserUsedPersonalEmail = '1',
}

export default function LogIn(props: Props) {
  const [searchParams] = useSearchParams();
  const { loginWithRedirect } = useAuth0();
  const [loginErrorType, setLoginErrorType] = useState('');
  const [loginErrorMsg, setLoginErrorMsg] = useState('');

  if (searchParams.get('redirect')) {
    localStorage.setItem('redirect', searchParams.get('redirect')!);
  }

  useEffect(() => {
    document.title = props.title;

    const errorType = searchParams.get('t');
    if (!errorType) {
      loginWithRedirect();
    }

    // if redirection to login page happened because of an application handled error
    // like user loggedin from personal page
    //
    if (errorType === LoginErrorType.UserUsedPersonalEmail) {
      const emailUsedDuringLogin = decodeURIComponent(searchParams.get('e') || '');
      setLoginErrorType(LoginErrorType.UserUsedPersonalEmail);
      setLoginErrorMsg(`You have used ${emailUsedDuringLogin} email id to login. This seems to be a personal email id. Please use work email id to login. If you want to login using this email id, please contact support.`);
    }
  }, []);

  return (
    <div style={{
      background: loginErrorType === '' ? '#fff' : '#FF7450',
      display: 'flex',
      height: '100%',
      flexDirection: 'column',
      color: '#fff',
      padding: '5rem',
      alignItems: 'center'
    }}
    >
      <div>
        <img
          src="https://s3.amazonaws.com/app.sharefable.com/favicon.png"
          alt="fable logo"
          style={{
            width: '64px'
          }}
        />
      </div>
      <div>
        {loginErrorType === '' && (<Loader width="80px" />)}
        {loginErrorMsg && (
        <>

          <p style={{
            fontSize: '1.15rem'
          }}
          >{loginErrorMsg}
          </p>
          <div>
            <Btn
              size="large"
              type="primary"
              onClick={() => loginWithRedirect()}
            >Click here to login using your work email id
            </Btn>
          </div>
        </>
        )}
      </div>
    </div>
  );
}
