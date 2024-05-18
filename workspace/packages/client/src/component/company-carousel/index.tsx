import React from 'react';
import { companiesUsingFable } from './data';
import * as Tags from './styled';

function CompanyCarousel(): JSX.Element {
  return (
    <Tags.CompanyCon>
      <div
        style={{
          animationDuration: `${companiesUsingFable.length * 4}s`,
        }}
        className="companiesImg"
      >
        {companiesUsingFable.map(
          ({ source, companyName }, idx) => (
            <img
              src={source}
              alt={companyName}
              style={{ objectFit: 'contain' }}
              key={`${source}-${idx}`}
              className="companyLogo"
            />
          ),
        )}
        {companiesUsingFable.map(
          ({ source, companyName }, idx) => (
            <img
              src={source}
              alt={companyName}
              style={{ objectFit: 'contain' }}
              key={`${source}-${idx}`}
              className="companyLogo"
            />
          ),
        )}
      </div>
      <div
        style={{
          animationDuration: `${companiesUsingFable.length * 4}s`,
        }}
        className="companiesImg"
      >
        {companiesUsingFable.map(
          ({ source, companyName }, idx) => (
            <img
              src={source}
              alt={companyName}
              style={{ objectFit: 'contain' }}
              key={`${source}-${idx}`}
              className="companyLogo"
            />
          ),
        )}
        {companiesUsingFable.map(
          ({ source, companyName }, idx) => (
            <img
              src={source}
              alt={companyName}
              style={{ objectFit: 'contain' }}
              key={`${source}-${idx}`}
              className="companyLogo"
            />
          ),
        )}
      </div>
    </Tags.CompanyCon>
  );
}

export default CompanyCarousel;
