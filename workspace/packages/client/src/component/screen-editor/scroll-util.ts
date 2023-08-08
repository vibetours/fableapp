import { SCREEN_DIFFS_SUPPORTED_VERSION } from '../../constants';

export function scrollIframeEls(version: string, doc: Document): Promise<void> {
  return new Promise((resolve, reject) => {
    switch (version) {
      case SCREEN_DIFFS_SUPPORTED_VERSION:
      case '2023-01-10': {
        // Apply original scroll positins to elements
        const allDocEls = doc.querySelectorAll('*');
        for (let i = 0; i < allDocEls.length; i++) {
          const el = allDocEls[i];
          if (el.nodeName.toLowerCase() === 'iframe') {
            const iframeEl = el as HTMLIFrameElement;
            const contentDoc = iframeEl.contentDocument;
            if (contentDoc) scrollIframeEls(version, iframeEl.contentDocument);
          }
          const scrollTopFactor = allDocEls[i].getAttribute('fable-stf') || '0';
          const scrollLeftFactor = allDocEls[i].getAttribute('fable-slf') || '0';
          const scrollTop = calculateScrollTopFromScrollFactor(scrollTopFactor, el);
          const scrollLeft = calculateScrollLeftFromScrollFactor(scrollLeftFactor, el);
          el.scroll({ top: scrollTop, left: scrollLeft });
        }
        break;
      }

      default:
        break;
    }
    setTimeout(() => resolve(), 0);
  });
}

function calculateScrollTopFromScrollFactor(scrollFactor: string, el: Element): number {
  return parseFloat(scrollFactor) * (el.scrollHeight - el.clientHeight);
}

function calculateScrollLeftFromScrollFactor(scrollFactor: string, el: Element): number {
  return parseFloat(scrollFactor) * (el.scrollWidth - el.clientWidth);
}
