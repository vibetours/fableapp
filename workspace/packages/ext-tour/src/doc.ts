export interface SerNode {
  type: number;
  name: string;
  attrs: Record<string, string | null>;
  props: {
    isStylesheet?: boolean;
    fileExt?: string;
    textContent?: string | null;
    isHidden?: boolean;
    origHref?: string | null;
  };
  chldrn: SerNode[];
}

interface PostProcess {
  type: "asset" | "iframe";
  path: string;
}

export interface SerDoc {
  frameUrl: string;
  userAgent: string;
  name: string;
  postProcesses: Array<PostProcess>;
  docTree?: SerNode;
  docTreeStr: string;
}

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

  function getRep(
    node: ChildNode,
    origin: string,
    traversalPath: Array<number>
  ): {
    serNode: SerNode;
    shouldSkip?: boolean;
    postProcess?: boolean;
    isHidden?: boolean;
  } {
    // *************** utils starts *************** //

    function isCaseInsensitiveEqual(
      str1: string | null | undefined,
      str2: string | null | undefined
    ): boolean {
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

    function getFileExtension(url: string): string {
      const urlSplit = url.split("/");
      if (urlSplit.length < 2) {
        return "";
      }
      const lastSplit = urlSplit[urlSplit.length - 1];

      const fileNameSplit = lastSplit.split(".");
      if (fileNameSplit.length < 2) {
        return "";
      }
      return fileNameSplit[fileNameSplit.length - 1];
    }

    function isCrossOrigin(url1: string, url2: string): boolean {
      if (!url1 || !url2) {
        // If a frame has no src defined then also we say it's from the same domain
        return false;
      }

      if (
        url1.trim().toLowerCase() === "about:blank"
        || url2.trim().toLowerCase() === "about:blank"
      ) {
        return false;
      }

      const u1 = new URL(url1);
      const u2 = new URL(url2);

      return u1.protocol !== u2.protocol || u1.host !== u2.host;
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
        if (
          !(sNode.name in HEAD_TAGS)
          && isCaseInsensitiveEqual(getComputedStyle(tNode).display, "none")
        ) {
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

    if (sNode.name === "script" || sNode.name === "noscript") {
      return { serNode: sNode, shouldSkip: true };
    }

    if (sNode.name === "link") {
      const tNode = node as HTMLLinkElement;
      if (tNode.sheet) {
        // external stylesheet
        sNode.props.isStylesheet = true;
        sNode.props.fileExt = ".css";
      } else {
        // Other assetlike icons
        sNode.props.isStylesheet = false;
        if (sNode.attrs.href) {
          sNode.props.fileExt = `.${getFileExtension(sNode.attrs.href)}`;
        }
      }
      return { serNode: sNode, postProcess: true };
    }

    if (sNode.name === "iframe") {
      const tNode = node as HTMLIFrameElement;
      const url = sNode.attrs.src || "";
      if (!isCrossOrigin(origin, url)) {
        const frameDoc = tNode.contentDocument || tNode.contentWindow?.document;
        if (!frameDoc) {
          console.log("Frame", url);
          throw new Error(
            "Iframe is same origin but document access is not possible"
          );
        }
        traversalPath.push(0);
        const rep = getRep(frameDoc.documentElement, origin, traversalPath);
        sNode.chldrn.push(rep.serNode);
        traversalPath.pop();
        return { serNode: sNode, postProcess: false };
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
        sNode.chldrn.push(rep.serNode);
      }
    }

    return { serNode: sNode };
  }

  const frameUrl = isTest ? "test://case" : document.URL;
  const rep = getRep(doc.documentElement, frameUrl, []);
  return {
    frameUrl,
    userAgent: doc.defaultView?.navigator.userAgent || "",
    name: doc.defaultView?.name || "",
    postProcesses,
    // When returning the serailized version of DOM, we stringify the JSON. Otherwise chrome removes some of the
    // nested objects in JSON data for some reason.
    docTreeStr: JSON.stringify(rep.serNode),
  };
}
