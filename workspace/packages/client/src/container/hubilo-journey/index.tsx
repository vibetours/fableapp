import { CalendarFilled, CalendarOutlined, CalendarTwoTone, CheckOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import Button from 'antd/lib/button';
import React, { ReactElement, useEffect, useState } from 'react';
import styled from 'styled-components';
import './index.css';

interface IOwnProps {
    title: string;
}

const tours = [
  {
    title: 'Intro',
    rid: 'https://app.staging.sharefable.com/p/tour/final-demo-june-2023-0eajnhber9rs81r1/intro-mtdlzc9cp9ueea0v/1687757160ef606bbe83aff'
  },
  {
    title: 'Layout',
    rid: 'https://app.staging.sharefable.com/p/tour/hbs-oe19ym4wjk9becre/-q9u4iwxi1shtopmz/16871526830fbaa59d29f9d'
  },
  {
    title: 'Engagement',
    rid: 'https://app.staging.sharefable.com/p/tour/hbs-oe19ym4wjk9becre/-38s3qsczzi1kq49r/1687326511bb8b6321f4eac'
  },
  {
    title: 'Branding',
    rid: 'https://app.staging.sharefable.com/p/tour/hbs-oe19ym4wjk9becre/-h1ed6mb99kbaiolf/16875069464d1ce2edb23c7',
  },
  {
    title: 'Stream a Video',
    rid: 'https://app.staging.sharefable.com/p/tour/hbs-oe19ym4wjk9becre/-fws2x29l6x2no170/16875083901ccc1ece57799',
  },
  {
    title: 'Conversion Propmpt',
    rid: 'https://app.staging.sharefable.com/p/tour/hbs-oe19ym4wjk9becre/-11dv0f6x8bxu02he/1687155145ff8141a51b8fb',
  },
  {
    title: 'Attendee View',
    rid: 'https://app.staging.sharefable.com/p/tour/hbs-oe19ym4wjk9becre/webinar-w8wv4lz073rd3ex4/1687155518792c03dd1f8b',
  },
  {
    title: 'Raise Hand',
    rid: 'https://app.staging.sharefable.com/p/tour/hbs-oe19ym4wjk9becre/webinar-kosbrfbu7a75vsrf/16871555353644be519c5b7',
  },
  {
    title: 'ROI & Outro',
    rid: 'https://app.staging.sharefable.com/p/tour/final-demo-june-2023-0eajnhber9rs81r1/leadscore1-b0fvk6binqum3217/1686890516e4bd63ea58ce9',
  }
];

const BOOK_A_DEMO_URL = 'https://www.hubilo.com/request-a-demo';

const CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

export default function HubiloJourney(props: IOwnProps):JSX.Element {
  const [currentTourRid, setCurrentTourRid] = useState(tours[0].rid);

  useEffect(() => {
    document.title = props.title;
  }, [props.title]);

  return (
    <div style={{ width: '1000px', height: '650px', border: 'none', margin: '2rem', padding: '1rem', background: '#eaeaea' }}>
      <iframe
        src={`${currentTourRid}`}
        title="IFrame"
        style={{
          width: '100%',
          height: '100%',
          border: 'none'
        }}
      />
      <Con>
        <Select
          style={{
            width: 150,
          }}
          dropdownStyle={{
            background: '#424242',
            borderRadius: '4px',
          }}
          bordered={false}
          dropdownMatchSelectWidth={false}
          placement="topLeft"
          defaultValue="https://app.staging.sharefable.com/p/tour/final-demo-june-2023-0eajnhber9rs81r1/intro-mtdlzc9cp9ueea0v/1687757160ef606bbe83aff"
          defaultOpen
          autoFocus
          menuItemSelectedIcon={<CheckOutlined />}
          options={tours.map(tour => ({ label: tour.title, value: tour.rid }))}
          onChange={(value: string) => setCurrentTourRid(value)}
        />
        <a
          type="link"
          style={{
            textDecoration: 'none',
            margin: '0 0.5rem',
            borderRadius: '4px',
            background: '#424242',
            color: '#d1dd2b',
            padding: '0.45rem 0.65rem'
          }}
          href={BOOK_A_DEMO_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span style={{ fontWeight: 500 }}>Get a demo!</span>
        </a>
      </Con>
    </div>
  );
}

const Con = styled.div`
  border-radius: 4px;
  position: fixed;
  top: 670px;
  left: 46px ;
  font-size: 0.9rem;

  .ant-select {
    background: #424242;
    border-radius: 4px;
  }

  .ant-select-selection-item {
    color: #eaeaea !important;
    font-size: 0.8rem;
  }
`;
