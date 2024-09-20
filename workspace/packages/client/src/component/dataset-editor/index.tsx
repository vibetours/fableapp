import React from 'react';
import EditableTable from './editable-table';
import { DatasetConfig } from '../../types';

interface Props {
  dataset: DatasetConfig,
  onDatasetConfigChange: (config: DatasetConfig) => void;
}

function DatasetEditor(props: Props): JSX.Element {
  return (
    <>
      <div style={{
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: '600px',
        margin: 'auto',
      }}
      >
        <EditableTable
          dataset={props.dataset}
          onDatasetConfigChange={props.onDatasetConfigChange}
        />
      </div>
    </>
  );
}

export default DatasetEditor;
