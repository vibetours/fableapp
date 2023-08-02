import React from 'react';
import DomElPicker, { HighlightMode } from './dom-element-picker';

type PropsType = {
    elements: Node[];
    domElPicker: DomElPicker | null;
    selectedEl: HTMLElement;
    count: number;
    setSelectedEl: (newSelEl: HTMLElement, prevSelEl: HTMLElement) => void;
    mouseLeaveHighlightMode: HighlightMode,
    disabled: boolean;
    rec?: boolean;
}

function AdvanceElementPicker({
  elements,
  domElPicker,
  selectedEl,
  count,
  setSelectedEl,
  disabled,
  rec,
  mouseLeaveHighlightMode
}: PropsType): JSX.Element {
  if (elements.length <= 0) {
    return <></>;
  }

  const el = elements[0];
  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          border: '1px solid lightgray',
          padding: '0.1rem 0.25rem',
          fontSize: '10px',
          pointerEvents: disabled ? 'none' : 'all',
          opacity: disabled ? 0.5 : 1,
          visibility: disabled && rec ? 'hidden' : 'visible',
          textTransform: 'lowercase',
          background: `${el === selectedEl ? domElPicker?.highlightBgColor() : 'white'}` }}
        onMouseMove={(e) => { e.stopPropagation(); domElPicker?.selectElement(el as HTMLElement, HighlightMode.Selection); }}
        onMouseLeave={(e) => { e.stopPropagation(); domElPicker?.selectElement(selectedEl, mouseLeaveHighlightMode); }}
        onClick={(e) => { e.stopPropagation(); setSelectedEl(el as HTMLElement, selectedEl); }}
      >
        {elements[0].nodeName}
        <AdvanceElementPicker
          rec
          disabled={disabled}
          elements={elements.slice(1)}
          domElPicker={domElPicker}
          selectedEl={selectedEl}
          count={count - 1}
          setSelectedEl={setSelectedEl}
          mouseLeaveHighlightMode={mouseLeaveHighlightMode}
        />
      </div>
    </div>
  );
}

export default AdvanceElementPicker;
