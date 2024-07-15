import React from 'react';
import { DemoHubConfigCtaType, DemoHubConfigCtaTypeType, IDemoHubConfigCta, SimpleStyle } from '../../../../types';
import Input from '../../../input';
import * as GTags from '../../../../common-styled';
import CaretOutlined from '../../../icons/caret-outlined';
import SimpleStyleEditor from '../../simple-styles-editor';
import { useEditorCtx } from '../../ctx';
import { InputText } from '../../../screen-editor/styled';

interface Props {
  cta: IDemoHubConfigCta;
}

export default function CtaEditor(props: Props): JSX.Element {
  const { onConfigChange } = useEditorCtx();

  const updateCtaProps = <K extends keyof IDemoHubConfigCta>(
    key: K,
    value: IDemoHubConfigCta[K]
  ): void => {
    onConfigChange(c => {
      const ctaIndex = c.cta.findIndex(cta => cta.id === props.cta.id);
      c.cta[ctaIndex] = { ...c.cta[ctaIndex], [key]: value };

      return {
        ...c,
        cta: [...c.cta],
      };
    });
  };

  const updateCtaSimpleStyle = <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]): void => {
    updateCtaProps('style', { ...props.cta.style, [key]: value });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '96%',
        margin: '0 auto',
        paddingBottom: '1rem',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <div className="typ-sm">Button text</div>
          <InputText
            type="text"
            defaultValue={props.cta.text}
            onChange={e => updateCtaProps('text', e.target.value)}
            style={{ height: '44px', width: '100%' }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <div className="typ-sm">CTA type</div>
          <GTags.FableSelect
            className="typ-ip"
            defaultValue={props.cta.type}
            placeholder="Select CTA type"
            bordered={false}
            options={DemoHubConfigCtaType.map(v => ({
              value: v,
              label: v.charAt(0).toUpperCase() + v.slice(1),
            }))}
            onChange={(e) => {
              if (e) {
                updateCtaProps('type', e as DemoHubConfigCtaTypeType);
              }
            }}
            suffixIcon={<CaretOutlined dir="down" />}
            style={{ height: '44px' }}
          />
        </div>

      </div>

      {props.cta.id !== 'see-all-demos' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <div className="typ-sm">Link</div>
          <InputText
            type="url"
            defaultValue={props.cta.link}
            onChange={e => updateCtaProps('link', e.target.value)}
            style={{ height: '44px', width: '100%' }}
          />
        </div>
      )}

      <SimpleStyleEditor
        simpleStyle={props.cta.style}
        simpleStyleUpdateFn={updateCtaSimpleStyle}
      />
    </div>
  );
}
