/* eslint-disable max-len */

export const TEXT_EDIT_DIV_CLS = 'fab-fbi-tedit';
export const DUPLICATE_DIV_CLS = 'fab-fbi-edup';

const html = `
<div style="display: flex; flex-direction: row;">
  <div style="width: 14px; height: 16px;" class="${TEXT_EDIT_DIV_CLS}">
    <?xml version="1.0" encoding="iso-8859-1"?>
    <svg version="1.1" 
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
      viewBox="0 0 512 512" style="fill:#fff;" xml:space="preserve">
        <g>
          <g>
            <path d="M458.667,0H53.333c-5.867,0-10.667,4.8-10.667,10.667v64c0,5.867,4.8,10.667,10.667,10.667
              C59.2,85.333,64,80.533,64,74.667V21.333h181.333v469.333h-64c-5.867,0-10.667,4.8-10.667,10.667
              c0,5.867,4.8,10.667,10.668,10.667h149.333c5.867,0,10.667-4.8,10.667-10.667c0-5.867-4.8-10.667-10.667-10.667h-64V21.333H448
              v53.333c0,5.867,4.8,10.667,10.667,10.667c5.867,0,10.667-4.8,10.667-10.667v-64C469.333,4.8,464.533,0,458.667,0z"/>
          </g>
        </g>
      </svg>
  </div>
  <div style="width: 14px; height: 16px; margin-left: 10px;" class="${DUPLICATE_DIV_CLS}">
    <svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" style="fill:#fff;">
      <path id="Path_245" data-name="Path 245" d="M31,4a3,3,0,0,0-3-3H15.59a3,3,0,0,0-3,3V16.41a3,3,0,0,0,3,3H28a3,3,0,0,0,3-3ZM29,4V16.41a1,1,0,0,1-1,1H15.59a1,1,0,0,1-1-1V4a1,1,0,0,1,1-1H28A1,1,0,0,1,29,4Z" transform="translate(-1 -1)" fill-rule="evenodd"/>
      <path id="Path_246" data-name="Path 246" d="M10.4,12.59H4a3,3,0,0,0-3,3V28a3,3,0,0,0,3,3H16.41a3,3,0,0,0,3-3V21.6a1,1,0,1,0-2,0V28a1,1,0,0,1-1,1H4a1,1,0,0,1-1-1V15.59a1,1,0,0,1,1-1h6.4a1,1,0,0,0,0-2Z" transform="translate(-1 -1)" fill-rule="evenodd"/>
    </svg>
  </div>
</div>
`;
export default html;
