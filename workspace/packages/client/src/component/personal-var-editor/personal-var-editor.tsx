import React, { useEffect, useRef, useState } from 'react';
import { CloseOutlined, CodeOutlined, FontSizeOutlined, WarningOutlined } from '@ant-design/icons';
import { IAnnotationConfig } from '@fable/common/dist/types';
import * as Tags from './styled';
import Button from '../button';
import { AnnotationPerScreen } from '../../types';
import { getPersVarsFromAnnotations, getPersVarsFromAnnsForTour, getPrefilledPerVarsFromLS, processPersVarsObj, recordToQueryParams, removeDuplicatesFromStrArr, setPersValuesInLS } from '../../utils';
import { InputText } from '../screen-editor/styled';

interface Props {
  showAsPopup: boolean;
  allAnnotationsForTour: AnnotationPerScreen[];
  rid: string;
  changePersVarParams: (persVarsParams: string) => void;
  annotationsForScreens: Record<string, IAnnotationConfig[]>;
  originalPersVarsParams: string;
  isLoading?: boolean;
  showEditor: boolean;
  setShowEditor: (showPersVarsEditor: boolean) => void;
}

export default function PersonalVarEditor(props: Props): JSX.Element {
  const [perVarsInTour, setPerVarsInTour] = useState<Record<string, string>>({});

  function resetLocalStoreObj(): void {
    const emptyPerVarsInTour: Record<string, string> = {};

    Object.keys(perVarsInTour).forEach(key => {
      emptyPerVarsInTour[key] = '';
    });

    setPersValuesInLS(emptyPerVarsInTour, props.rid);
  }

  function saveParamsHandler() : void {
    const searchParamStr = recordToQueryParams({ ...processPersVarsObj(perVarsInTour) }, props.originalPersVarsParams);
    props.changePersVarParams(`?${searchParamStr}`);

    if (props.showAsPopup) {
      props.setShowEditor(false);
    }
  }

  function handleDiscard() : void {
    const searchParams = new URLSearchParams(props.originalPersVarsParams);

    Object.keys(perVarsInTour).forEach(key => {
      searchParams.delete(`v_${key}`);
    });

    resetLocalStoreObj();

    setPerVarsInTour((prevParams) => {
      const updatedParams = Object.keys(prevParams).reduce((acc, key) => {
        acc[key] = '';
        return acc;
      }, {} as Record<string, string>);

      return updatedParams;
    });

    props.changePersVarParams(searchParams.toString());

    if (props.showAsPopup) {
      props.setShowEditor(false);
    }
  }

  useEffect(() => {
    const perVars = removeDuplicatesFromStrArr(
      [...getPersVarsFromAnnsForTour(props.allAnnotationsForTour),
        ...getPersVarsFromAnnotations(props.annotationsForScreens)
      ]
    );
    const perVarsObj = getPrefilledPerVarsFromLS(perVars, props.rid);
    setPerVarsInTour(perVarsObj);
  }, [props.allAnnotationsForTour, props.annotationsForScreens]);

  return (
    <Tags.VarEditorCon showAsPopup={props.showAsPopup} showEditor={props.showEditor}>
      {props.showAsPopup && (
        <Button
          className="popup-btn"
          icon={<CodeOutlined />}
          onClick={() => props.setShowEditor(!props.showEditor)}
        />)}
      {
        props.showEditor && (
          <div className="pers-var-editor">
            <div className="typ-h1 heading">
              <h4 className="heading-h4">Customize Demo</h4>
              {!props.showAsPopup && (
                <button
                  className="close-btn"
                  type="button"
                  onClick={() => {
                    props.setShowEditor(false);
                  }}
                >
                  <CloseOutlined />
                </button>
              )}
            </div>
            {
              !props.isLoading ? (
                <>
                  {Object.keys(perVarsInTour).length > 0
                    ? (
                      <div className="typ-reg">
                        We have detected the following variables in your demo.
                        Enter value for these variabes to customise the demo.

                        <div className="demo-url">
                          <div className="demo-url-title">
                            Demo URL:
                          </div>
                          <code className="custom-scrollbar">
                            <span className="url-code">?</span>
                            <span className="url-code">
                              {recordToQueryParams(processPersVarsObj(perVarsInTour)).trim()}
                            </span>
                          </code>
                        </div>
                      </div>
                    )
                    : (
                      <div className="no-vars-text">
                        <div className="typ-reg">
                          Use variables in annotation message and pass variable values from
                          URL parameter to customize your demo
                        </div>
                        <ul className="typ-reg">
                          <li>
                            You can use simple text variable
                            <div>
                              <code>{'{{ first_name }}'}</code> in annotation text and pass dynamic value from url parameters
                            </div>
                          </li>
                        </ul>
                      </div>
                    )}
                  {Object.keys(perVarsInTour).length > 0 && (
                  <>
                    <div className="per-var-input-con custom-scrollbar">
                      {
                    Object.keys(perVarsInTour).map((perVar, index) => (
                      <div className="pers-var-input" key={perVar}>
                        <label htmlFor={perVar} className="typ-reg pervar-label">
                          <FontSizeOutlined style={{ fontSize: '1.75rem' }} />
                          <code>{perVar}</code>
                        </label>
                        <InputText
                          id={perVar}
                          style={{ padding: '0.5rem 0.75rem' }}
                          value={perVarsInTour[perVar]}
                          onChange={(e) => {
                            const newPerVarsInTour = { ...perVarsInTour, [perVar]: e.target.value };
                            setPersValuesInLS(newPerVarsInTour, props.rid);
                            setPerVarsInTour(prev => (
                              {
                                ...prev,
                                [perVar]: e.target.value
                              }
                            ));
                          }}
                        />
                      </div>
                    ))
                  }
                    </div>
                    <div className="errors custom-scrollbar">
                      {
                        Object.keys(perVarsInTour).map(perVar => (
                          perVarsInTour[perVar] === ''
                            ? (
                              <div key={perVar} className="error typ-sm">
                                <WarningOutlined style={{ color: 'red' }} />
                            &nbsp;Variable "{perVar}" is not set
                              </div>
                            )
                            : <React.Fragment key={perVar} />
                        ))
                      }
                    </div>
                    <div className="bottom-btns">
                      <Button
                        className="btns"
                        size="medium"
                        intent="secondary"
                        onClick={() => handleDiscard()}
                      >
                        Discard
                      </Button>
                      <Button
                        className="btns"
                        size="medium"
                        intent="primary"
                        onClick={() => saveParamsHandler()}
                      >
                        Save
                      </Button>
                    </div>
                  </>)}
                </>
              ) : <p className="typ-h3 loading-state">Loading...</p>
            }
          </div>
        )
      }
    </Tags.VarEditorCon>
  );
}
