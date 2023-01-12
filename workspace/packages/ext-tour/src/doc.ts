import { SerDoc, PostProcess, SerNodeWithPath, SerNode } from "@fable/common/dist/types";

// TODO ability to blacklist elements from other popular extensions like loom, grammarly etc
//
// TODO We execute the function as part of chrome content script injection.
//      By requirement (of chrome) the function should content self suffient i.e. should not import
//      any module / should not use any functioin from closure. Hence we needed to duplicate the
//      util functions as an inner function.
//      Some of these function definitions exists in utils as well thereby duplicating the same definitions
//      in multiple places.
//      We need to be able to do this via webpack compilation
//      Inner utility functions like isContentEmpty, getRandomId are used in multiple location

/*
 * This function will be used from testcases and from chrome content script exectution context
 * If it's being run from content script execution context then we don't pass the parameters to
 * the function. That's how the function behaves based on the fact the testInjectedParams is passed
 * or not. This makes the module unit testable.
 */

export function getSearializedDom(
  params?: any,
  testInjectedParams?: {
    doc: Document;
  }
): SerDoc {
  const isTest = !!(testInjectedParams && testInjectedParams.doc);
  const doc: Document = isTest ? testInjectedParams.doc : document;

  const postProcesses: Array<PostProcess> = [];
  const icons: Array<SerNodeWithPath> = [];

  function getRep(
    node: ChildNode,
    origin: string,
    traversalPath: Array<number>
  ): {
    serNode: SerNode;
    shouldSkip?: boolean;
    isIcon?: boolean;
    postProcess?: boolean;
    isHidden?: boolean;
  } {
    // *************** utils starts *************** //

    function isCaseInsensitiveEqual(str1: string | null | undefined, str2: string | null | undefined): boolean {
      if (str1 && str2 && str1.toLowerCase() === str2.toLowerCase()) {
        return true;
      }

      return false;
    }

    function isContentEmpty(el: Text): boolean {
      if (!el.textContent) {
        return true;
      }
      let content = el.textContent;
      content = content.replace(/[\s\n]+/g, "");
      if (content === "") {
        return true;
      }
      return false;
    }

    function isCrossOrigin(url1: string, url2: string): boolean {
      if (!url1 || !url2) {
        // If a frame has no src defined then also we say it's from the same origin
        return false;
      }

      if (url1.trim().toLowerCase() === "about:blank" || url2.trim().toLowerCase() === "about:blank") {
        return false;
      }

      const u1 = new URL(url1);
      const u2 = new URL(url2);

      return u1.protocol !== u2.protocol || u1.host !== u2.host;
    }

    function isVisible(el: HTMLElement): boolean {
      const style = getComputedStyle(el);
      return !(style.visibility === "hidden" || style.display === "none");
    }

    const HEAD_TAGS = {
      head: 1,
      title: 1,
      style: 1,
      base: 1,
      link: 1,
      meta: 1,
      script: 1,
      noscript: 1,
    };

    const ICON_MATCHER = new RegExp("icon", "i");

    const NO_INCLUDE_DOM_EL = {
      script: 1,
      noscript: 1,
      base: 1,
    };

    // *************** utils ends *************** //

    const sNode: SerNode = {
      type: node.nodeType,
      name: "",
      attrs: {},
      props: {},
      chldrn: [],
    };

    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        const tNode = node as HTMLElement;
        sNode.name = tNode.tagName.toLowerCase();
        const attrNames = tNode.getAttributeNames();
        for (const name of attrNames) {
          sNode.attrs[name] = tNode.getAttribute(name);
        }
        if (!(sNode.name in HEAD_TAGS) && isCaseInsensitiveEqual(getComputedStyle(tNode).display, "none")) {
          sNode.props.isHidden = true;
        }
        break;

      case Node.TEXT_NODE:
        sNode.name = node.nodeName;
        if (isContentEmpty(node as Text)) {
          return { serNode: sNode, shouldSkip: true };
        }
        sNode.props.textContent = (node as Text).textContent;
        break;

      case Node.COMMENT_NODE:
        return { serNode: sNode, shouldSkip: true };

      default:
        console.error("unknown node", node);
        throw new Error("node type could not be parsed");
    }

    if (sNode.name in NO_INCLUDE_DOM_EL) {
      return { serNode: sNode, shouldSkip: true };
    }

    if (sNode.name === "link") {
      const tNode = node as HTMLLinkElement;
      if (tNode.sheet) {
        return { serNode: sNode, postProcess: true };
      }
      const rel = (tNode.getAttribute("rel") || "").toLowerCase();
      if (ICON_MATCHER.exec(rel) !== null) {
        return { serNode: sNode, postProcess: true, isIcon: true };
      }
      return { serNode: sNode, shouldSkip: true };
    }

    if (sNode.name === "iframe" || sNode.name === "frame") {
      const tNode = node as HTMLIFrameElement;
      const url = sNode.attrs.src || "";
      const rect = tNode.getBoundingClientRect();
      sNode.props.rect = {
        height: rect.height,
        width: rect.width,
      };

      if (rect.height === 0 || rect.width === 0 || !isVisible(tNode)) {
        // If an iframe is not visible we skip it from DOM. While other element can be hidden and we still
        // save in serialized file as those could contain css or other scripts as a child,
        // we omit the iframe entry since iframe has isolated execution context which makes no sense to have
        // an entry on serialized json.
        return { serNode: sNode, shouldSkip: true };
      }

      if (!isCrossOrigin(origin, url)) {
        try {
          const frameDoc = tNode.contentDocument || tNode.contentWindow?.document;
          if (!frameDoc) {
            throw new Error(`Iframe with origin ${url} is same origin but document access is not possible`);
          }
          traversalPath.push(0);
          const rep = getRep(frameDoc.documentElement, origin, traversalPath);
          sNode.chldrn.push(rep.serNode);
          traversalPath.pop();
          return { serNode: sNode, postProcess: false };
        } catch {
          // Sometime a frame would have "about:blank" set but then would have a cross origin
          // <base> set. For those we would find exception on accessing document.
          return { serNode: sNode, postProcess: true };
        }
      }

      return { serNode: sNode, postProcess: true };
    }

    // TODO <img>, <audio>, <video>
    // TODO <canvas>
    // TODO background image in style

    const childNodes = node.childNodes;

    if (childNodes.length) {
      for (let i = 0, ii = 0; i < childNodes.length; i++) {
        traversalPath.push(ii);
        const rep = getRep(childNodes[i], origin, traversalPath);
        const traversalPathStr = traversalPath.join(".");
        traversalPath.pop();
        if (rep.shouldSkip) {
          continue;
        }
        ii++;
        if (rep.postProcess) {
          const postProcess = {} as PostProcess;
          postProcess.type = rep.serNode.name === "iframe" ? "iframe" : "asset";
          postProcess.path = traversalPathStr;
          postProcesses.push(postProcess);
        }
        if (rep.isIcon) {
          icons.push(Object.assign(rep.serNode, { path: traversalPathStr }));
        }
        sNode.chldrn.push(rep.serNode);
      }
    }

    return { serNode: sNode };
  }

  const frameUrl = isTest ? "test://case" : document.URL;
  const rep = getRep(doc.documentElement, frameUrl, []);
  const rect = doc.body.getBoundingClientRect();

  let candidateIcon: SerNodeWithPath | null = null;
  for (const icon of icons) {
    if (icon.attrs.rel === "icon") {
      candidateIcon = icon;
      break;
    } else if (!candidateIcon && icon.attrs.rel === "shortcut icon") {
      candidateIcon = icon;
    }
  }
  if (candidateIcon === null && icons.length) {
    candidateIcon = icons[0];
  }

  return {
    frameUrl,
    title: doc.title,
    userAgent: doc.defaultView?.navigator.userAgent || "",
    name: doc.defaultView?.name || "",
    postProcesses,
    // When returning the serailized version of DOM, we stringify the JSON. Otherwise chrome removes some of the
    // nested objects in JSON data for some reason.
    docTreeStr: JSON.stringify(rep.serNode),
    rect: {
      height: rect.height,
      width: rect.width,
    },
    icon: candidateIcon,
    baseURI: doc.body.baseURI,
  };
}
