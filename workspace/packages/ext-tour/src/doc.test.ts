import { JSDOM } from 'jsdom';
import { getSearializedDom } from './doc';

describe('Doc', () => {
  describe('#getRep', () => {
    let dom: JSDOM;
    beforeAll(() => {
      dom = new JSDOM('<!DOCTYPE html><body><p>Hello world</p></body>');
    });

    it('should work', () => {
      const rep = getSearializedDom(null, { doc: dom.window.document }) as any;
      expect(rep.length).toBe(1);
      expect(rep).toMatchObject([
        {
          BODY: [
            [
              {
                P: [
                  [
                    {
                      text: 'Hello world',
                    },
                  ],
                ],
              },
            ],
          ],
        },
      ]);
    });
  });
});
