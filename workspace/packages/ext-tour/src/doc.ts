export interface SerNode {
  type: number;
  name: string;
  attrs: Record<string, string | null>;
  props: {
    isStylesheet?: boolean;
    proxyFileName?: string;
    fileExt?: string;
    data?: string;
  };
  chldrn: SerNode[];
}

interface PostProcess {
  type: "asset" | "iframe";
  path: string;
}

export interface SerDoc {
  frameUrl: string;
  cookie: string;
  userAgent: string;
  postProcesses: Array<PostProcess>;
  docTree: SerNode;
}

// TODO ability to blacklist elements from other popular extensions like loom, grammarly etc

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
  const postProcesses: Array<PostProcess> = [];

  function getRep(
    node: ChildNode,
    traversalPath: Array<number>
  ): {
    serNode: SerNode;
    shouldSkip?: boolean;
    postProcess?: boolean;
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

    function getRandomId(): string {
      return (
        Math.random().toString(16).substring(2, 15)
        + Math.random().toString(16).substring(2, 15)
      );
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
        if (isCaseInsensitiveEqual(tNode.style.display, "none")) {
          return { serNode: sNode, shouldSkip: true };
        }
        break;

      case Node.TEXT_NODE:
        sNode.name = node.nodeName;
        if (isContentEmpty(node as Text)) {
          // If the text node is used to create just space or newline then skip it
          // as it does not add it to semantics
          return { serNode: sNode, shouldSkip: true };
        }
        break;

      case Node.COMMENT_NODE:
        return { serNode: sNode, shouldSkip: true };
        break;

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
        if (sNode.attrs.href) {
          sNode.props.data = sNode.attrs.href;
        }
      } else {
        // Other assetlike icons
        sNode.props.isStylesheet = false;
        if (sNode.attrs.href) {
          sNode.props.fileExt = getFileExtension(sNode.attrs.href);
          sNode.props.data = sNode.attrs.href;
        }
      }
      sNode.props.proxyFileName = getRandomId();
      return { serNode: sNode, postProcess: true };
    }

    if (sNode.name === "iframe") {
      return { serNode: sNode, postProcess: true };
    }

    const childNodes = node.childNodes;

    if (childNodes.length) {
      for (let i = 0, ii = 0; i < childNodes.length; i++) {
        traversalPath.push(ii);
        const rep = getRep(childNodes[i], traversalPath);
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

  if (testInjectedParams && testInjectedParams.doc) {
    const rep = getRep(testInjectedParams.doc.documentElement, [-1]);
    return {
      frameUrl: "test://case",
      cookie: testInjectedParams.doc.cookie,
      userAgent: testInjectedParams.doc.defaultView?.navigator.userAgent || "",
      postProcesses,
      docTree: rep.serNode,
    };
  }

  const rep = getRep(document.documentElement, [-1]);
  return {
    frameUrl: document.URL,
    cookie: document.cookie,
    userAgent: document.defaultView?.navigator.userAgent || "",
    postProcesses,
    docTree: rep.serNode,
  };
}
