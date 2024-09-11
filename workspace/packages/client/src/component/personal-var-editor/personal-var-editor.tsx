import React, { useEffect, useRef, useState } from 'react';
import { FontSizeOutlined, LoadingOutlined, WarningOutlined } from '@ant-design/icons';
import { IAnnotationConfig } from '@fable/common/dist/types';
import * as Tags from './styled';
import Button from '../button';
import { AnnotationPerScreen, ScreenSizeData } from '../../types';
import { getPersVarsFromAnnotations, getPersVarsFromAnnsForTour, getPrefilledPerVarsFromLS, processPersVarsObj, recordToQueryParams, removeDuplicatesFromStrArr, setPersValuesInLS } from '../../utils';
import { InputText } from '../screen-editor/styled';

interface Props {
  allAnnotationsForTour: AnnotationPerScreen[];
  rid: string;
  isLoading?: boolean;
  changePersVarParams: (persVarsParams: string) => void;
  annotationsForScreens: Record<string, IAnnotationConfig[]>;
  originalPersVarsParams: string;
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
  }

  function handleDiscard() : void {
    resetLocalStoreObj();

    setPerVarsInTour((prevParams) => {
      const updatedParams = Object.keys(prevParams).reduce((acc, key) => {
        acc[key] = '';
        return acc;
      }, {} as Record<string, string>);

      return updatedParams;
    });
    props.changePersVarParams(props.originalPersVarsParams);
    props.setShowEditor(false);
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
    <Tags.VarEditorCon>
      <p className="typ-h1">Personalize demo</p>
      {
          !props.isLoading ? (
            <>
              {Object.keys(perVarsInTour).length > 0
                ? (
                  <div className="typ-reg">
                    We have detected the following variables in your demo.
                    Enter value for these variabes to personalize the demo.

                    <div className="demo-url typ-sm">
                      <span>
                        URL Parameter:
                      </span>
                      <code>
                        <span className="url-code">?</span>
                        <span className="url-code">
                          {recordToQueryParams(processPersVarsObj(perVarsInTour)).trim()}
                        </span>
                      </code>
                    </div>
                  </div>
                ) : (
                  <div className="no-vars-text">
                    <div className="typ-reg">
                      Use variables in annotation message and pass variable values from
                      URL parameter to personalize your demo
                    </div>
                    <ul className="typ-reg">
                      <li>
                        You can simply use a variable <code>{'{{ first_name }}'}</code> in annotation text to personalize the demo
                      </li>
                      <li>
                        Pass the variable value via URL parameter <code>?v_first_name=John+Doe</code> to personalize the demo for <em>John Doe</em>
                      </li>
                    </ul>
                    <p className="typ-reg">
                      Once you add variable(s) in the annotation message, come back here to check how this demo can be personalized.
                    </p>
                  </div>
                )}
              {Object.keys(perVarsInTour).length > 0 && (
              <>
                <div className="per-var-input-con custom-scrollbar">
                  {
                Object.keys(perVarsInTour).map((perVar, index) => (
                  <div className="pers-var-input" key={perVar}>
                    <label htmlFor={perVar} className="typ-reg pervar-label">
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
                    Apply
                  </Button>
                </div>
              </>)}
            </>
          ) : <p className="typ-reg loading-state"><LoadingOutlined /> Loading...</p>
        }
    </Tags.VarEditorCon>
  );
}
