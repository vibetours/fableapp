import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as Tags from './styled';
import QualificationQuestion, { IFormData, QualificationDecision } from '../../component/form/qualification-question';

type FullFormData = Record<string, {
  formHeader: string;
  qualificationCriteria: Array<IFormData>;
  qualificationDecision: QualificationDecision;
}>

function Form() {
  const params = useParams<{formId: string}>();
  const [isDataLoaded, setDataLoaded] = useState(false);
  const [formData, setFormData] = useState<FullFormData | null>(null);

  useEffect(() => {
    (async () => {
      const resp = await fetch(`https://fable-tour-app-gamma.s3.ap-south-1.amazonaws.com/root/form-data/manual_form_data.json?ts=${+new Date()}`);
      const data = await resp.json() as FullFormData;
      setDataLoaded(true);
      setFormData(data);
    })();
  }, []);

  if (!isDataLoaded) {
    return (<div>TODO show loader'</div>);
  }

  const {
    qualificationDecision,
    qualificationCriteria,
    formHeader
  } = formData![params.formId!];

  return (
    <Tags.FormContainer>
      <QualificationQuestion
        formHeader={formHeader}
        form={qualificationCriteria}
        descision={qualificationDecision}
      />
    </Tags.FormContainer>
  );
}

export default Form;
