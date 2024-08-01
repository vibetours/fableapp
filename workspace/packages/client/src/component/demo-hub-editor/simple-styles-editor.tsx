import React from 'react';
import { compileValue, createGlobalProperty, createLiteralProperty, GlobalPropsPath } from '@fable/common/dist/utils';
import * as GTags from '../../common-styled';
import { InputNumberBorderRadius } from '../screen-editor/styled';
import { SimpleStyle } from '../../types';
import ApplyStylesMenu from '../screen-editor/apply-styles-menu';
import { isGlobalProperty } from '../../utils';
import { useEditorCtx } from './ctx';

export type SimpleStyleUpdateFn<OmittedKeys extends keyof SimpleStyle = never>
= <K extends keyof Omit<SimpleStyle, OmittedKeys>>(
  key: K,
  value: Omit<SimpleStyle, OmittedKeys>[K]
) => void;

interface Props<OmittedKeys extends keyof SimpleStyle = never> {
  simpleStyle: Partial<SimpleStyle>;
  simpleStyleUpdateFn: SimpleStyleUpdateFn<OmittedKeys>;
  bgColorTitle ?: string;
  borderColorTitle ?: string;
  fontColorTitle ?: string;
  borderRadiusTitle ?: string;
}

export default function SimpleStyleEditor(props: Props): JSX.Element {
  const { globalConfig } = useEditorCtx();
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4px',
      }}
    >
      {props.simpleStyle.bgColor !== undefined && (
        <div>
          <div
            className="typ-sm"
            style={{
              marginBottom: '0.25rem'
            }}
          >
            { props.bgColorTitle || 'Background color'}
          </div>
          <GTags.ColorPicker
            style={{
              minWidth: 'unset'
            }}
            className="typ-ip"
            showText={(color) => color.toHexString()}
            onChangeComplete={e => props.simpleStyleUpdateFn('bgColor', e.toHexString())}
            defaultValue={props.simpleStyle.bgColor}
          />
        </div>
      )}

      {props.simpleStyle.bgColorProp !== undefined && (
      <div>
        <div
          className="typ-sm"
          style={{
            marginBottom: '0.25rem'
          }}
        >
          { props.bgColorTitle || 'Background color'}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <GTags.ColorPicker
            style={{
              minWidth: 'unset',
              width: '100%'
            }}
            className="typ-ip"
            showText={(color) => color.toHexString()}
            onChangeComplete={e => props.simpleStyleUpdateFn('bgColorProp', createLiteralProperty(e.toHexString()))}
            value={props.simpleStyle.bgColorProp._val}
          />
          <ApplyStylesMenu
            isGlobal={isGlobalProperty(props.simpleStyle.bgColorProp)}
            onApplyGlobal={() => {
              props.simpleStyleUpdateFn(
                'bgColorProp',
                createGlobalProperty(
                  compileValue(globalConfig, GlobalPropsPath.primaryColor),
                  GlobalPropsPath.primaryColor
                )
              );
            }}
          />
        </div>
      </div>
      )}

      {props.simpleStyle.borderColor !== undefined && (
        <div>
          <div
            className="typ-sm"
            style={{
              marginBottom: '0.25rem'
            }}
          >
            {props.borderColorTitle || 'Border color'}
          </div>
          <GTags.ColorPicker
            style={{
              minWidth: 'unset'
            }}
            className="typ-ip"
            showText={(color) => color.toHexString()}
            onChangeComplete={e => props.simpleStyleUpdateFn('borderColor', e.toHexString())}
            defaultValue={props.simpleStyle.borderColor}
          />
        </div>
      )}

      {props.simpleStyle.fontColor !== undefined && (
        <div>
          <div
            className="typ-sm"
            style={{
              marginBottom: '0.25rem'
            }}
          >
            {props.fontColorTitle || 'Font color'}
          </div>
          <GTags.ColorPicker
            style={{
              minWidth: 'unset'
            }}
            className="typ-ip"
            showText={(color) => color.toHexString()}
            onChangeComplete={e => props.simpleStyleUpdateFn('fontColor', e.toHexString())}
            defaultValue={props.simpleStyle.fontColor}
          />
        </div>
      )}

      {props.simpleStyle.borderRadius !== undefined && (
        <div>
          <div
            className="typ-sm"
            style={{
              marginBottom: '0.25rem'
            }}
          >
            {props.borderRadiusTitle || 'Border radius'}
          </div>
          <InputNumberBorderRadius
            onChange={e => props.simpleStyleUpdateFn('borderRadius', e ? +e : 0)}
            defaultValue={props.simpleStyle.borderRadius}
            className="typ-ip"
            min={0}
            addonAfter="px"
            style={{
              height: '40px',
              width: '100%'
            }}
          />
        </div>
      )}

    </div>
  );
}
