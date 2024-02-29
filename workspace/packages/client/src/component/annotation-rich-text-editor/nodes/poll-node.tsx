/* eslint-disable class-methods-use-this */

import {
  DecoratorNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import * as React from 'react';
import { Suspense } from 'react';
import { getRandomId } from '@fable/common/dist/utils';
import { FABLE_LEAD_FORM_ID, FABLE_LEAD_FORM_VALIDATION_FN } from '../../../constants';
import { removeFieldNameDefinition } from '../utils/poll-node-utils';

const styles = `
.LeadForm__container {
  display: block;
  cursor: pointer;
  user-select: none;
  font-family: inherit;
  border-radius: var(--f-ann-border-radius);
  background-color: color-mix(in srgb, var(--f-ann-bg-color) 50%, white);
  border: none;
  padding: 14px 44px 44px 44px;
}
.LeadForm__container.focused {
  outline: 2px solid var(--f-ann-primary-color);
}
.LeadForm__inner {
  width: 100%;
  cursor: default;
  gap: 16px;
  display: flex;
  flex-direction: column;
}
.LeadForm__optionContainer {
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  margin: 0px;
}
.LeadForm__inputValidation {
  font-size: 1rem;
  visibility: hidden;
  color: #963214;
  width: 100%;
  margin-bottom: 6px;
}
.LeadForm__optionInputWrapper {
  flex: 1;
  display: flex;
  width: 100%;
  border: none;
  box-shadow: 0 0 0 2px var(--f-ann-primary-color);
  padding: 4px 0;
  border-radius: 5px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}
.LeadForm__optionInput {
  display: flex;
  flex: 1px;
  border: 0px;
  padding: 7px;
  color: var(--fable-ann-font-color);
  background-color: transparent;
  font-weight: bold;
  outline: 0px;
  z-index: 0;
}
.LeadForm__optionInput::placeholder {
  font-weight: normal;
  color: #999;
}
`;

export type Options = ReadonlyArray<Option>;

export type Option = Readonly<{
  text: string;
  uid: string;
  isMandatory: boolean;
  type: LeadFormField;
}>;

const PollComponent = React.lazy(() => import('./poll-component'));

export type LeadFormField = 'email' | 'text'

export function createPollOption(text = '', isMandatory = false, type: LeadFormField = 'text'): Option {
  return {
    text,
    uid: getRandomId(),
    isMandatory,
    type
  };
}

function cloneOption(
  option: Option,
  text: string,
): Option {
  return {
    text,
    uid: option.uid,
    isMandatory: option.isMandatory,
    type: option.type
  };
}

export type SerializedPollNode = Spread<
  {
    options: Options;
  },
  SerializedLexicalNode
>;

function convertPollElement(domNode: HTMLElement): DOMConversionOutput | null {
  const options = domNode.getAttribute('data-lexical-poll-options');
  if (options !== null) {
    const node = $createPollNode(JSON.parse(options));
    return { node };
  }
  return null;
}

export class PollNode extends DecoratorNode<JSX.Element> {
  __options: Options;

  static getType(): string {
    return 'poll';
  }

  static clone(node: PollNode): PollNode {
    return new PollNode(node.__options, node.__key);
  }

  static importJSON(serializedNode: SerializedPollNode): PollNode {
    const node = $createPollNode(
      serializedNode.options,
    );
    serializedNode.options.forEach(node.addOption);
    return node;
  }

  constructor(options: Options, key?: NodeKey) {
    super(key);
    this.__options = options;
  }

  exportJSON(): SerializedPollNode {
    return {
      options: this.__options,
      type: 'poll',
      version: 1,
    };
  }

  addOption(option: Option): void {
    const self = this.getWritable();
    const options = Array.from(self.__options);
    options.unshift(option);
    self.__options = options;
  }

  deleteOption(option: Option): void {
    const self = this.getWritable();
    const options = Array.from(self.__options);
    const index = options.indexOf(option);
    options.splice(index, 1);
    self.__options = options;
  }

  setOptionText(option: Option, text: string): void {
    const self = this.getWritable();
    const clonedOption = cloneOption(option, text);
    const options = Array.from(self.__options);
    const index = options.indexOf(option);
    options[index] = clonedOption;
    self.__options = options;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-poll-options')) {
          return null;
        }

        return {
          conversion: convertPollElement,
          priority: 2,
        };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const container = document.createElement('span');
    const innerCon = document.createElement('span');
    const styleTag = document.createElement('style');

    container.appendChild(innerCon);

    container.setAttribute(
      'data-lexical-poll-options',
      JSON.stringify(this.__options),
    );

    container.classList.add('LeadForm__container');
    container.setAttribute('id', FABLE_LEAD_FORM_ID);

    innerCon.classList.add('LeadForm__inner');

    for (const option of this.__options) {
      const optionCon = document.createElement('span');
      const optionInputWrapper = document.createElement('span');
      const optionInputValidationWrapper = document.createElement('span');
      const optionInput = document.createElement('input');

      optionCon.classList.add('LeadForm__optionContainer');
      optionCon.setAttribute('fable-input-field-uid', option.uid);
      optionCon.setAttribute(FABLE_LEAD_FORM_VALIDATION_FN, option.type);
      innerCon.appendChild(optionCon);

      optionInputValidationWrapper.innerText = 'Error msg';
      optionInputValidationWrapper.classList.add('LeadForm__inputValidation');
      optionInputValidationWrapper.setAttribute('fable-validation-uid', option.uid);

      optionInputWrapper.classList.add('LeadForm__optionInputWrapper');
      optionCon.appendChild(optionInputWrapper);
      optionCon.appendChild(optionInputValidationWrapper);

      optionInput.classList.add('LeadForm__optionInput');
      optionInput.setAttribute('fable-input-uid', option.uid);
      optionInput.type = 'text';
      optionInput.placeholder = removeFieldNameDefinition(option.text);
      optionInputWrapper.appendChild(optionInput);
    }

    styleTag.innerHTML = styles;
    container.appendChild(styleTag);

    return { element: container };
  }

  createDOM(): HTMLElement {
    const elem = document.createElement('span');
    elem.style.display = 'inline-block';
    return elem;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <Suspense fallback={null}>
        <PollComponent
          options={this.__options}
          nodeKey={this.__key}
        />
      </Suspense>
    );
  }
}

export function $createPollNode(options: Options): PollNode {
  return new PollNode(options);
}

export function $isPollNode(
  node: LexicalNode | null | undefined,
): node is PollNode {
  return node instanceof PollNode;
}
