import { JSDOM } from 'jsdom';
import { getSearializedDom } from '../doc';
import { checkCSS, checkAttributes, checkChildren, checkEmptyNodes, checkScriptAndNoScript } from './TestMarkups';

describe('DOM Serialization', () => {
  // @TODO: Check how to load css files using jsdom
  // describe('check CSS', () => {
  //   let dom: JSDOM;
  //   beforeAll(() => {
  //     dom = new JSDOM(checkCSS, { resources: 'usable' });
  //   });

  //   it('should extract css', () => {
  //     const rep = getSearializedDom(null, { doc: dom.window.document }) as any;

  //     expect(rep).toMatchObject({
  //       attrs: {
  //         lang: 'en'
  //       },
  //       chldrn: [
  //         {
  //           chldrn: [
  //             {
  //               chldrn: [
  //                 {
  //                   node: '#text',
  //                   nodeVal: 'Check CSS',
  //                   type: 3
  //                 }
  //               ],
  //               tag: 'title',
  //               type: 1
  //             }
  //           ],
  //           tag: 'head',
  //           type: 1
  //         },
  //         {
  //           chldrn: [
  //             {
  //               chldrn: [
  //                 {
  //                   node: '#text',
  //                   nodeVal: 'Hello World',
  //                   type: 3
  //                 }
  //               ],
  //               tag: 'p',
  //               type: 1
  //             }
  //           ],
  //           tag: 'body',
  //           type: 1
  //         }
  //       ],
  //       tag: 'html',
  //       type: 1
  //     });
  //   });
  // });

  describe('check attributes', () => {
    let dom: JSDOM;
    beforeAll(() => {
      dom = new JSDOM(checkAttributes);
    });

    it('should extract attributes', () => {
      const rep = getSearializedDom(null, { doc: dom.window.document }) as any;

      expect(rep).toMatchObject({
        attrs: {
          lang: 'en'
        },
        chldrn: [
          {
            chldrn: [
              {
                chldrn: [
                  {
                    node: '#text',
                    nodeVal: 'Check Attributes',
                    type: 3
                  }
                ],
                tag: 'title',
                type: 1
              }
            ],
            tag: 'head',
            type: 1
          },
          {
            attrs: {
              class: 'my-class',
              id: 'my-id'
            },
            chldrn: [
              {
                chldrn: [
                  {
                    node: '#text',
                    nodeVal: 'Hello World',
                    type: 3
                  }
                ],
                tag: 'p',
                type: 1
              }
            ],
            tag: 'body',
            type: 1
          }
        ],
        tag: 'html',
        type: 1
      });
    });
  });

  describe('check children', () => {
    let dom: JSDOM;
    beforeAll(() => {
      dom = new JSDOM(checkChildren);
    });

    it('should extract children', () => {
      const rep = getSearializedDom(null, { doc: dom.window.document }) as any;

      expect(rep).toMatchObject({
        attrs: {
          lang: 'en'
        },
        chldrn: [
          {
            chldrn: [
              {
                chldrn: [
                  {
                    node: '#text',
                    nodeVal: 'Check Children',
                    type: 3
                  }
                ],
                tag: 'title',
                type: 1
              }
            ],
            tag: 'head',
            type: 1
          },
          {
            attrs: {
              class: 'my-class',
              id: 'my-id'
            },
            chldrn: [
              {
                chldrn: [
                  {
                    chldrn: [
                      {
                        node: '#text',
                        nodeVal: 'Hello World',
                        type: 3
                      }
                    ],
                    tag: 'p',
                    type: 1
                  }
                ],
                tag: 'div',
                type: 1
              }
            ],
            tag: 'body',
            type: 1
          }
        ],
        tag: 'html',
        type: 1
      });
    });
  });

  describe('check empty nodes', () => {
    let dom: JSDOM;
    beforeAll(() => {
      dom = new JSDOM(checkEmptyNodes);
    });

    it('should not serialize empty nodes (spaces and newlines)', () => {
      const rep = getSearializedDom(null, { doc: dom.window.document }) as any;

      expect(rep).toMatchObject({
        attrs: {
          lang: 'en'
        },
        chldrn: [
          {
            chldrn: [
              {
                chldrn: [
                  {
                    node: '#text',
                    nodeVal: 'Check Empty Nodes',
                    type: 3
                  }
                ],
                tag: 'title',
                type: 1
              }
            ],
            tag: 'head',
            type: 1
          },
          {
            attrs: {
              class: 'my-class',
              id: 'my-id'
            },
            chldrn: [
              {
                chldrn: [
                  {
                    chldrn: [
                      {
                        node: '#text',
                        nodeVal: 'Hello World',
                        type: 3
                      }
                    ],
                    tag: 'p',
                    type: 1
                  }
                ],
                tag: 'div',
                type: 1
              }
            ],
            tag: 'body',
            type: 1
          }
        ],
        tag: 'html',
        type: 1
      });
    });
  });

  describe('check script and noscript tags', () => {
    let dom: JSDOM;
    beforeAll(() => {
      dom = new JSDOM(checkScriptAndNoScript);
    });

    it('should not serialize script and noscript tags', () => {
      const rep = getSearializedDom(null, { doc: dom.window.document }) as any;

      expect(rep).toMatchObject({
        attrs: {
          lang: 'en'
        },
        chldrn: [
          {
            chldrn: [
              {
                chldrn: [
                  {
                    node: '#text',
                    nodeVal: 'Check Script and Noscript Tags',
                    type: 3
                  }
                ],
                tag: 'title',
                type: 1
              }
            ],
            tag: 'head',
            type: 1
          },
          {
            attrs: {
              class: 'my-class',
              id: 'my-id'
            },
            chldrn: [
              {
                chldrn: [
                  {
                    chldrn: [
                      {
                        node: '#text',
                        nodeVal: 'Hello World',
                        type: 3
                      }
                    ],
                    tag: 'p',
                    type: 1
                  }
                ],
                tag: 'div',
                type: 1
              }
            ],
            tag: 'body',
            type: 1
          }
        ],
        tag: 'html',
        type: 1
      });
    });
  });
});
