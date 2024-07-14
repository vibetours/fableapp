import React from 'react';
import * as GTags from '../../common-styled';
import { InputNumberBorderRadius } from '../screen-editor/styled';
import { SimpleStyle } from '../../types';

interface Props {
  simpleStyle: Partial<SimpleStyle>;
  simpleStyleUpdateFn: <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]) => void;
}

export default function SimpleStyleEditor(props: Props): JSX.Element {
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
            Background Color
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

      {props.simpleStyle.borderColor !== undefined && (
        <div>
          <div
            className="typ-sm"
            style={{
              marginBottom: '0.25rem'
            }}
          >
            Border Color
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
            Font Color
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
            Border Radius
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
