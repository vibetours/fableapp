import React, { useEffect, useState } from 'react';
import { CodeOutlined, FontSizeOutlined, WarningOutlined } from '@ant-design/icons';
import { IAnnotationConfig } from '@fable/common/dist/types';
import * as Tags from './styled';
import Button from '../button';
import { AnnotationPerScreen } from '../../types';
import { getPersVarsFromAnnotations, getPersVarsFromAnnsForTour, getPrefilledPerVarsFromLS, removeDuplicatesFromStrArr, setPersValuesInLS } from '../../utils';
import { InputText } from '../screen-editor/styled';

interface Props {
  showAsPopup: boolean;
  allAnnotationsForTour: AnnotationPerScreen[];
  rid: string;
  changePersVarParams: (persVarsParams: string) => void;
  annotationsForScreens: Record<string, IAnnotationConfig[]>;
  originalPersVarsParams: string;
  isLoading?: boolean
}

export default function PersonalVarEditor(props: Props): JSX.Element {
  const [showEditor, setShowEditor] = useState(!props.showAsPopup);
  const [perVarsInTour, setPerVarsInTour] = useState<Record<string, string>>({});

  function saveParamsHandler() : void {
    const searchParams = new URLSearchParams(props.originalPersVarsParams);

    Object.keys(perVarsInTour).forEach(key => {
      searchParams.set(`v_${key}`, perVarsInTour[key]);
    });

    props.changePersVarParams(`?${searchParams.toString()}`);
  }

  function handleDiscard() : void {
    const searchParams = new URLSearchParams(props.originalPersVarsParams);

    Object.keys(perVarsInTour).forEach(key => {
      searchParams.delete(`v_${key}`);
    });

    setPerVarsInTour((prevParams) => {
      const updatedParams = Object.keys(prevParams).reduce((acc, key) => {
        acc[key] = '';
        return acc;
      }, {} as Record<string, string>);

      return updatedParams;
    });

    props.changePersVarParams(searchParams.toString());
  }

  useEffect(() => {
    const perVars = removeDuplicatesFromStrArr(
      [...getPersVarsFromAnnsForTour(props.allAnnotationsForTour),
        ...getPersVarsFromAnnotations(props.annotationsForScreens)
      ]
    );

    setPerVarsInTour(getPrefilledPerVarsFromLS(perVars, props.rid));
  }, [props.allAnnotationsForTour, props.annotationsForScreens]);

  return (
    <Tags.VarEditorCon showAsPopup={props.showAsPopup} showEditor={showEditor}>
      <Button
        className="popup-btn"
        icon={<CodeOutlined />}
        onClick={() => setShowEditor(prev => !prev)}
      />
      {
        showEditor && (
          <div className="pers-var-editor">
            <div className="typ-h1">Customize Demo</div>
            {
              !props.isLoading ? (
                <>
                  {Object.keys(perVarsInTour).length > 0
                    ? (
                      <div className="typ-reg">
                        We have detected the following variables in your demo.
                        Enter value for these variabes to customise the demo.

                        <div className="demo-url">
                          Demo URL:
                          <code>
                            ?v_var_name1&v_var_name2
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
                    <div className="per-var-input-con">
                      {
                    Object.keys(perVarsInTour).map((perVar) => (
                      <div className="pers-var-input" key={perVar}>
                        <div className="typ-reg pervar-label">
                          <FontSizeOutlined style={{ fontSize: '1.75rem' }} />
                          <code>{perVar}</code>
                        </div>
                        <InputText
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
                    <div className="errors">
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
