export const FIELD_NAME_VARIABLE_REGEX = /\{\[(.*)\]\}/;

export const removeFieldNameDefinition = (placeholderString: string): string => {
  const res = placeholderString.replace(FIELD_NAME_VARIABLE_REGEX, '').trim();
  return res;
};
