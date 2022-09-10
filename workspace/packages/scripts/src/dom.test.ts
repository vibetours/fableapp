import { __testables__ } from './dom';

function budgetDeepClone(obj: Object): Object {
  return JSON.parse(JSON.stringify(obj));
}

describe('dom', () => {
  describe('#saveCurrentProperty', () => {
    it('should store property properly for furture restoration', () => {
      const el = {
        a: 1,
        b: {
          c: 2,
        },
      };

      const el1 = budgetDeepClone(el);
      __testables__.saveCurrentProperty(el1, 'a', -1);
      expect(el1).toEqual({
        __fab_a__: 1,
        a: 1,
        b: {
          c: 2,
        },
      });

      const el2 = budgetDeepClone(el);
      __testables__.saveCurrentProperty(el2, 'd', -1);
      expect(el2).toEqual({
        __fab_d__: -1,
        a: 1,
        b: {
          c: 2,
        },
      });

      const el3 = budgetDeepClone(el);
      __testables__.saveCurrentProperty(el3, 'b.c', -1);
      expect(el3).toEqual({
        __fab_b_c__: 2,
        a: 1,
        b: {
          c: 2,
        },
      });

      // WARN: This case should not happen and is ensured by the caller. As if this happens
      // then the caller would get an error at the next step while assigning the property
      // ----
      // const el4 = budgetDeepClone(el);
      // __testables__.saveCurrentProperty(el4, 'b.c.d', -1);
      // expect(el4).toEqual({
      //   __fab_b_c_d__: -1,
      //   a: 1,
      //   b: {
      //     c: 2,
      //   },
      // });
    });
  });

  describe('restoreSavedProperty', () => {
    it('should restore property that is already saved', () => {
      const el = {
        __fab_a__: 10,
        __fab_b_c__: 20,
        __fab_b_c_d_e__: 50,
        a: 1,
        b: {
          c: 2,
        },
      };

      const el1 = budgetDeepClone(el);
      __testables__.restoreSavedProperty(el1, 'a');
      expect(el1).toEqual({
        __fab_b_c__: 20,
        __fab_b_c_d_e__: 50,
        a: 10,
        b: {
          c: 2,
        },
      });

      __testables__.restoreSavedProperty(el1, 'b.c');
      expect(el1).toEqual({
        __fab_b_c_d_e__: 50,
        a: 10,
        b: {
          c: 20,
        },
      });

      __testables__.restoreSavedProperty(el1, 'b.d');
      expect(el1).toEqual({
        __fab_b_c_d_e__: 50,
        a: 10,
        b: {
          c: 20,
        },
      });

      __testables__.restoreSavedProperty(el1, 'b.f');
      expect(el1).toEqual({
        __fab_b_c_d_e__: 50,
        a: 10,
        b: {
          c: 20,
        },
      });
    });
  });
});
