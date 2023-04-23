import Button from 'antd/lib/button';
import { useAuth0 } from '@auth0/auth0-react';
import React, { useEffect } from 'react';
import Loader from '../loader';

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

export default function Logout() {
  const { logout } = useAuth0();

  useEffect(() => {
    setTimeout(() => {
      logout({ logoutParams: { returnTo: `${APP_CLIENT_ENDPOINT}/login` } });
    }, 1000);
  }, []);

  return (
    <div>
      <Loader width="80px" />
    </div>
  );
}
