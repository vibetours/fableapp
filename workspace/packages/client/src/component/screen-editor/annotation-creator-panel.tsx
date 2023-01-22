import React, { MouseEventHandler } from 'react';
import { IAnnotationConfig, AnnotationPositions } from '@fable/common/dist/types';
import TextArea from 'antd/lib/input/TextArea';
import Select from 'antd/lib/select';
import * as Tags from './styled';
import * as GTags from '../../common-styled';

interface IProps {
  config?: IAnnotationConfig
}

interface IState {

}

export default class AnnotationCreatorPanel extends React.PureComponent<IProps, IState> {
  render() {
    if (!this.props.config) {
      return <></>;
    }

    return (
      <Tags.AnotCrtPanelCon>
        <Tags.AnotCrtPanelSec>
          <GTags.Txt style={{ marginBottom: '0.25rem' }}>Body text</GTags.Txt>
          <TextArea style={{ width: '100%' }} rows={4} defaultValue={this.props.config.bodyContent} />
        </Tags.AnotCrtPanelSec>
        <Tags.AnotCrtPanelSec row>
          <GTags.Txt style={{ marginRight: '0.25rem' }}>Positioning</GTags.Txt>
          <Select
            defaultValue={this.props.config.positioning}
            size="small"
            style={{ minWidth: '120px' }}
            options={Object.values(AnnotationPositions).map(v => ({
              value: v,
              label: `${v} ${v === AnnotationPositions.Auto ? '' : '(not yet supported)'}`,
              disabled: v !== AnnotationPositions.Auto
            }))}
          />
        </Tags.AnotCrtPanelSec>
      </Tags.AnotCrtPanelCon>
    );
  }
}
