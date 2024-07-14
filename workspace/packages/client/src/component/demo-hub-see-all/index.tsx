import React, { useEffect, useRef } from 'react';
import { createGlobalStyle } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { IDemoHubConfig } from '../../types';
import * as Tags from './styled';
import Header from './header';
import { isLeadFormPresent, validateInput } from '../annotation/utils';
import Button from '../button';
import * as GTags from '../../common-styled';
import { getorCreateDemoHubScriptEl, getOrCreateDemoHubStyleEl } from '../../utils';
import './index.css';

interface Props {
  config: IDemoHubConfig;
}

const GlobalStyle = createGlobalStyle<{fontSize: number}>`
  html {
    font-size: ${props => (props.fontSize)}px;
  }
`;

const FABLE_FONT_ID = 'fable-font';

const scrollToSection = (): void => {
  if (window.location.hash) {
    const element = document.getElementById(window.location.hash.substring(1));
    if (element) {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth' });
      }, 10);
    }
  }
};

export const addFontToHeader = (doc: Document, fontFamily: string):void => {
  const linkHref = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@100..900&display=swap`;
  const fableFontEl = doc.getElementById(FABLE_FONT_ID);
  if (!fableFontEl) {
    const link = doc.createElement('link');
    link.href = linkHref;
    link.rel = 'stylesheet';
    link.id = 'fable-font';
    link.type = 'text/css';
    doc.head.append(link);
  } else if ((fableFontEl as HTMLLinkElement).href !== linkHref) {
    (fableFontEl as HTMLLinkElement).href = linkHref;
  }
};

interface Params {
  key: string,
  value: string
}

const getLeadFormParams = (): string => {
  let allLfParams = 'skiplf=1';
  const newUrl = new URL(window.location.href);

  newUrl.searchParams.forEach((value, key) => {
    if (key !== 'show' && key !== 'lf') {
      allLfParams += `&${key}=${value}`;
    }
  });

  return allLfParams;
};

function DemoHubSeeAll(props: Props): JSX.Element {
  const conRef = useRef<HTMLDivElement | null>(null);
  const location = window.location;

  const currentSlug = location.hash.slice(1);
  const searchParams = new URLSearchParams(location.search);
  const demoRid = searchParams.get('show');
  const leadFormFilled = searchParams.get('lf');
  const paramsFromLeadForm = getLeadFormParams();
  const navigate = useNavigate();
  const rootSheet = useRef<HTMLStyleElement | null>(null);

  const updateUrl = (addParams: Params[] | null, removeParam?: string | null, slug?: string): void => {
    const sparam = new URLSearchParams(location.search);

    if (addParams) {
      addParams.forEach((addParam) => {
        sparam.set(addParam.key, addParam.value);
      });
    }

    if (removeParam) {
      sparam.delete(removeParam);
    }

    const newSearch = sparam.toString();
    const newHash = slug ? `#${slug}` : location.hash;

    navigate({
      pathname: location.pathname,
      search: newSearch ? `?${newSearch}` : '',
      hash: newHash,
    });
  };

  useEffect(() => {
    if (!rootSheet.current) {
      rootSheet.current = document.createElement('style');
      document.head.appendChild(rootSheet.current);
    }
    rootSheet.current.innerHTML = `
      :root {
        --f-header-border-color: ${props.config.see_all_page.header.style.borderColor};
        --f-header-font-color: ${props.config.see_all_page.header.style.fontColor};
        --f-header-bg-color: ${props.config.see_all_page.header.style.bgColor};
        --f-body-bg-color: ${props.config.see_all_page.body.style.bgColor};
        --f-body-font-color: ${props.config.see_all_page.body.style.fontColor};
        --f-democard-bg-color: ${props.config.see_all_page.demoCardStyles.bgColor};
        --f-democard-border-color: ${props.config.see_all_page.demoCardStyles.borderColor};
        --f-democard-border-radius: ${props.config.see_all_page.demoCardStyles.borderRadius}px;
        --f-democard-font-color: ${props.config.see_all_page.demoCardStyles.fontColor};
        --f-demomodal-bg-color: ${props.config.see_all_page.demoModalStyles.body.bgColor};
        --f-demomodal-font-color: ${props.config.see_all_page.demoModalStyles.body.fontColor};
        --f-demomodal-border-color: ${props.config.see_all_page.demoModalStyles.body.borderColor};
        --f-demomodal-border-radius: ${props.config.see_all_page.demoModalStyles.body.borderRadius}px;
        --f-page-content-gutter: 5;
        --f-body-content-gutter: 3;
      }

      html, body, div, span, button, p, button, input {
        font-family: ${props.config.fontFamily._val ?? 'inherit'} !important;
      }

      button {
        font-weight: bold;
      }

      a.cta {
        font-weight: 500;
      }
  `;
  }, [props.config]);

  useEffect(() => {
    scrollToSection();
    addFontToHeader(document, props.config.fontFamily._val);
  }, [props.config.fontFamily._val]);

  useEffect(() => {
    getorCreateDemoHubScriptEl(props.config.customScripts);
  }, [props.config.customScripts]);

  useEffect(() => {
    getOrCreateDemoHubStyleEl(props.config.customStyles);
  }, [props.config.customStyles]);

  const processLeadForm = (): boolean => {
    if (conRef.current && isLeadFormPresent(conRef.current)) {
      const leadFormFields = conRef.current?.getElementsByClassName('LeadForm__optionContainer');

      let isValidForm = true;
      const leadForm: Record<string, string | undefined> = {};
      if (leadFormFields) {
        for (const field of Array.from(leadFormFields)) {
          const { isValid, fieldName, fieldValue } = validateInput(field as HTMLDivElement);
          if (!isValid) isValidForm = false;
          leadForm[fieldName] = fieldValue;
        }
      }

      if (!isValidForm) return false;
      const leadFormSrchParams = [{ key: 'lf', value: '1' }];
      for (const key in leadForm) {
        if (leadForm[key]) {
          const param: Params = {
            key,
            value: leadForm[key]!
          };
          leadFormSrchParams.push(param);
        }
      }
      updateUrl(leadFormSrchParams);
    }

    return true;
  };

  const getDemoName = (rid: string): string => {
    try {
      return props.config.see_all_page.sections.filter(section => section.demos.some(demo => demo.rid === rid))[0].demos.filter(demo => demo.rid === rid)[0].name;
    } catch (e: any) {
      raiseDeferredError(e as Error);
      return '';
    }
  };

  return (
    <div className="dh-page">
      <GlobalStyle fontSize={props.config.baseFontSize} />
      {props.config.see_all_page.showLeadForm && leadFormFilled !== '1' && (
      <Tags.DemoModal
        title={currentSlug.replace(/-/g, ' ')}
        open={Boolean(props.config.see_all_page.showLeadForm)}
        style={{
          maxWidth: '480px'
        }}
        footer={[
          <Button
            key="submit"
            onClick={() => {
              processLeadForm();
            }}
            borderRadius={props.config.see_all_page.demoCardStyles.borderRadius}
            bgColor={props.config.see_all_page.demoCardStyles.bgColor}
            color={props.config.see_all_page.demoCardStyles.fontColor}
            borderColor={props.config.see_all_page.demoCardStyles.borderColor}
            style={{ flex: 1 }}
          >
            Continue
          </Button>
        ]}
        closable={false}
        width="80vw"
        centered
        maskStyle={{
          background: props.config.see_all_page.demoModalStyles.overlay.bgColor,
          backdropFilter: 'blur(3px)'
        }}
      >
        <GTags.LeadFormEntryCon
          fontSizeNormal="1rem"
          fontSizeLarge="1.6rem"
          fontSizeHuge="2.1rem"
          fontColor={props.config.see_all_page.demoCardStyles.fontColor}
          bgColor={props.config.see_all_page.demoCardStyles.bgColor}
          scaleDownLeadForm
          borderRadius={props.config.see_all_page.demoModalStyles.body.borderRadius}
          ref={conRef}
        >
          <div dangerouslySetInnerHTML={{ __html: props.config.leadform.bodyContent }} />
        </GTags.LeadFormEntryCon>
      </Tags.DemoModal>
      )}
      <>
        <Header config={props.config} />
        <div className="body">
          {/* <Tags.BodyText
            bgColor={props.config.see_all_page.body.style.bgColor}
            fontColor={props.config.see_all_page.body.style.fontColor}
            className="body-text"
          > */}
          <p className="typ-reg desc">{props.config.see_all_page.body.text}</p>
          {/* </Tags.BodyText> */}
          <div className="section-con">
            {props.config.see_all_page.sections.map(section => (
              <Tags.Section
                bgColor={section.simpleStyle.bgColor}
                borderRadius={section.simpleStyle.borderRadius}
                fontColor={section.simpleStyle.fontColor}
                key={section.id}
                id={section.slug}
                className="section"
                borderColor={section.simpleStyle.borderColor}
              >
                <div
                  className="typ-h2 title"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${location.origin}/demo-hub-see-all#${section.slug}`
                    );
                  }}
                >
                  {section.title}
                </div>
                <p className="typ-reg desc">{section.desc}</p>
                <div className="demo-card-con">
                  {section.demos.map((demo) => (
                    <div
                      className="demo-card"
                      key={demo.rid}
                      onClick={() => {
                        updateUrl([
                          { key: 'show', value: demo.rid }
                        ], null, section.slug);
                      }}
                    >
                      <img
                        src={demo.thumbnail}
                        alt={demo.rid}
                        className="thumb"
                      />
                      <span className="typ-reg demo-name">{demo.name}</span>
                    </div>
                  ))}
                </div>
              </Tags.Section>
            ))}
          </div>
        </div>
        {demoRid && (
        <Tags.DemoModal
          className="demo-display-modal-con"
          title={
            <span
              className="typ-h2"
              style={{
                fontWeight: 500
              }}
            >
              {getDemoName(demoRid)}
            </span>
          }
          open={Boolean(demoRid)}
          destroyOnClose
          footer={null}
          onCancel={() => {
            updateUrl(null, 'show', currentSlug);
          }}
          width="80vw"
          centered
          maskStyle={{
            background: props.config.see_all_page.demoModalStyles.overlay.bgColor,
            backdropFilter: 'blur(3px)'
          }}
        >
          <div
            style={{
              height: '80vh',
            }}
          >
            <iframe
              width="100%"
              height="100%"
              src={`${location.origin}/embed/demo/${demoRid}?skiplf=1&${paramsFromLeadForm}`}
              allowFullScreen
              title={demoRid}
              style={{ border: 'none' }}
            />
          </div>
        </Tags.DemoModal>
        )}
      </>

    </div>
  );
}

export default DemoHubSeeAll;
