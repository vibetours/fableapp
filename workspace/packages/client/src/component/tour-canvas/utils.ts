import { AnnotationNode, Box, CanvasGrid, Point } from './types';
import { AnnotationPerScreen } from '../../types';
import { P_RespScreen } from '../../entity-processor';

export function formScreens2(data: AnnotationPerScreen[], grid: CanvasGrid): {
  annotationNodes: AnnotationNode<Box>[],
  screens: P_RespScreen[],
} {
  const annotationNodes: AnnotationNode<Box>[] = [];
  const screens: P_RespScreen[] = [];
  for (const el of data) {
    screens.push(el.screen);
    if (el.annotations.length !== 0) {
      for (const annotation of el.annotations) {
        annotationNodes.push({
          id: `${el.screen.id}/${annotation.refId}`,
          width: grid.gridSize * 6,
          height: grid.gridSize * 4,
          x: 0,
          y: 0,
          imageUrl: el.screen.thumbnailUri.href,
          text: annotation.displayText,
          screenTitle: el.screen.displayName,
        });
      }
    }
  }
  return { annotationNodes, screens };
}

export function getEdges(data: AnnotationPerScreen[]) {
  const edges: [srcId: string, destId: string][] = [];
  for (const el of data) {
    for (const ann of el.annotations) {
      const fromId = `${el.screen.id}/${ann.refId}`;
      for (const btn of ann.buttons) {
        if (btn.type === 'next' && btn.hotspot && btn.hotspot.actionType === 'navigate') {
          const toId = btn.hotspot.actionValue;
          edges.push([fromId, toId]);
        }
      }
    }
  }
  return edges;
}

export function formPathUsingPoints(points: Point[]) {
  let d = 'M ';
  points.forEach((point, index) => {
    if (index === 0) {
      d += Object.values(point).join(',');
    }
    d = `${d} L ${Object.values(point).join(',')}`;
  });
  return d;
}

export function getEndPointsUsingPath(d: string) {
  const commands = d.split(/(?=[LMC])/);
  const pointArrays = commands.map((dStr: string) => {
    const pointsArray = dStr.slice(1, dStr.length).split(',');
    const pairsArray = [];
    for (let i = 0; i < pointsArray.length; i += 2) {
      pairsArray.push([+pointsArray[i], +pointsArray[i + 1]]);
    }
    return pairsArray[0];
  });

  const start = pointArrays[0];
  const end = pointArrays[pointArrays.length - 1];

  return [{ x: start[0], y: start[1] }, { x: end[0], y: end[1] }];
}

export const getImgScreenData = () => ({
  version: '2023-01-10',
  vpd: {
    h: -1,
    w: -1
  },
  docTree: {
    type: 1,
    name: 'html',
    attrs: {
      lang: 'en',
      'fable-stf': '0',
      'fable-slf': '0',
      style: 'width: 100%; height: 100%;'
    },
    props: {},
    chldrn: [
      {
        type: 1,
        name: 'head',
        attrs: {
          'fable-stf': '0',
          'fable-slf': '0'
        },
        props: {},
        chldrn: [
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'meta',
            attrs: {
              charset: 'UTF-8',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'meta',
            attrs: {
              'http-equiv': 'X-UA-Compatible',
              content: 'IE=edge',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'meta',
            attrs: {
              name: 'viewport',
              content: 'width=device-width, initial-scale=1.0',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'title',
            attrs: {
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: [
              {
                type: 3,
                name: '#text',
                attrs: {},
                props: {
                  textContent: 'Image iframe'
                },
                chldrn: []
              }
            ]
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'style',
            attrs: {
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {
              cssRules: 'body { margin: 0px; padding: 0px; } #img { width: 100%; height: auto; } '
            },
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          }
        ]
      },
      {
        type: 8,
        name: '#text',
        attrs: {},
        props: {},
        chldrn: []
      },
      {
        type: 1,
        name: 'body',
        attrs: {
          'fable-stf': '0',
          'fable-slf': '0',
          style: 'visibility: visible;width: 100%; min-height: 100vh;display: flex;align-items: center;justify-content: center;'
        },
        props: {},
        chldrn: [
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'img',
            attrs: {
              id: 'img',
              src: '',
              alt: 'Image',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {
            },
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 8,
            name: '#text',
            attrs: {},
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'div',
            attrs: {
              id: 'fable-0-cm-presence',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: []
          },
          {
            type: 1,
            name: 'div',
            attrs: {
              id: 'fable-0-de-presence',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: []
          },
          {
            type: 8,
            name: 'div',
            attrs: {
              style: '\n    \n    display: flex !important;\n    background-color: #7567FF !important;\n    top:-10000px; \n    left:-10000px;\n    position: fixed !important;\n    border-radius: 28px !important;\n    justify-content: center !important;\n    align-items: center !important;\n    padding: 8px 24px !important;\n    gap: 8px !important;\n    z-index: 9999999 !important;\n  \n    top: 670px !important;\n    left: 1297px !important;\n  ',
              class: 'fable-dont-ser',
              'fable-stf': '0',
              'fable-slf': '0'
            },
            props: {},
            chldrn: []
          }
        ]
      }
    ]
  }
});
