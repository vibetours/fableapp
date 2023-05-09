import { CSSProperties } from "react";

export const FABLE_CONTROL_PILL = "fable-dont-ser";
export const BATCH_SIZE = 5;

export function getRandomId(): string {
  return Math.random().toString(16).substring(2, 15) + Math.random().toString(16).substring(2, 15);
}

export function isCrossOrigin(url1: string, url2: string): boolean {
  if (!url1 || !url2) {
    // If a frame has no src defined then also we say it's from the same origin
    return false;
  }

  if (url1.startsWith("/") || url2.startsWith("/")) {
    // both are relative url
    return false;
  }

  if (url1.trim().toLowerCase() === "about:blank" || url2.trim().toLowerCase() === "about:blank") {
    return false;
  }

  const u1 = new URL(url1);
  const u2 = new URL(url2);

  return u1.protocol !== u2.protocol || u1.host !== u2.host;
}

export function getCookieHeaderForUrl(cookies: chrome.cookies.Cookie[], pageUrl: URL): String {
  const host = pageUrl.host;
  const path = pageUrl.pathname;
  const hostParts = host.split(".");
  const allSubDomains: Record<string, number> = {};

  let cumulativeSubDomain = `.${hostParts[hostParts.length - 1]}`;
  for (let i = hostParts.length - 2; i >= 0; i--) {
    cumulativeSubDomain = `${i > 0 ? "." : ""}${hostParts[i]}${cumulativeSubDomain}`;
    allSubDomains[cumulativeSubDomain] = 1;
  }

  return cookies
    .filter((cookie) => cookie.domain in allSubDomains && path.startsWith(cookie.path || "/"))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export function getAbsoluteUrl(urlStr: string, baseUrl: string) {
  try {
    const url = new URL(urlStr);
    return url.href;
  } catch {
    const first2CharOfUrl = urlStr.substring(0, 2);
    if (first2CharOfUrl === "//") {
      // https://stackoverflow.com/a/9646435/2474269
      return new URL(baseUrl).protocol + urlStr;
    }
    if (first2CharOfUrl.charAt(0) === "/") {
      return new URL(baseUrl).origin + urlStr;
    }
    return baseUrl + urlStr;
  }
}

export function createImgNode(src: string, alt: string, height: number, width: number, classList: Array<string>) {
  const imgNode = document.createElement("img");
  imgNode.setAttribute("src", src);
  imgNode.setAttribute("alt", alt);
  imgNode.style.height = `${height}px`;
  imgNode.style.width = `${width}px`;
  imgNode.setAttribute("height", `${height}`);
  imgNode.setAttribute("width", `${width}`);
  imgNode.classList.add(...classList);

  return imgNode;
}

export function isCaseInsensitiveEqual(str1: string | null | undefined, str2: string | null | undefined): boolean {
  return !!(str1 && str2 && str1.toLowerCase() === str2.toLowerCase());
}

export function isContentEmpty(el: Text): boolean {
  if (!el.textContent) {
    return true;
  }
  let content = el.textContent;
  content = content.replace(/[\s\n]+/g, "");
  return content === "";
}

export function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  return !(style.visibility === "hidden" || style.display === "none");
}
