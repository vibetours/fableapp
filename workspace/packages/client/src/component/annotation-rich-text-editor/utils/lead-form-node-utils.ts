export const FIELD_NAME_VARIABLE_REGEX = /\{\[(.*)\]\}/;
export type LeadFormField = 'email' | 'text'
export const OPTION_INPUT_CLASSNAME = 'LeadForm__optionInputInAnn';

export const removeFieldNameDefinition = (placeholderString: string): string => {
  const res = placeholderString.replace(FIELD_NAME_VARIABLE_REGEX, '').trim();
  return res;
};
