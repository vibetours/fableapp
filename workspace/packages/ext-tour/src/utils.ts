import { hexToRGB } from "@fable/common/dist/utils";
import { DEFAULT_BORDER_RADIUS } from "@fable/common/dist/types";

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

export function addStyleProperty(element: HTMLElement, style: string) {
  const originalStyles = element.getAttribute("style") || "";
  const newStyles = `
    ${originalStyles}
    ${style}
  `;
  element.setAttribute("style", newStyles);
}

export function createImgNode(src: string, alt: string, height: number, width: number, classList: Array<string>) {
  const imgNode = document.createElement("img");
  imgNode.setAttribute("src", src);
  imgNode.setAttribute("alt", alt);
  imgNode.setAttribute("height", `${height}`);
  imgNode.setAttribute("width", `${width}`);
  imgNode.classList.add(...classList);

  const impStyles = `
    width: ${width}px !important;
    height: ${height}px !important;
  `;

  addStyleProperty(imgNode, impStyles);

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

export const hslToHex = (hsl: string) : string => {
  const hslValues = hsl.match(/\d+/g);
  const h = parseInt(hslValues![0], 10);
  const s = parseInt(hslValues![1], 10) / 100;
  const l = parseInt(hslValues![2], 10) / 100;
  let r; let g; let
    b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hueToRgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h / 360 + 1 / 3);
    g = hueToRgb(p, q, h / 360);
    b = hueToRgb(p, q, h / 360 - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const standardizeHex = (hex: string) : string => {
  const one = hex[1];
  const two = hex[2];
  const three = hex[3];
  return hex.length === 7 ? hex : `#${one}${one}${two}${two}${three}${three}`;
};

export function isShadeOfWhiteOrBlack(hexColor: string): boolean {
  const rgbColor = hexToRGB(hexColor);

  const grayThreshold = 30;

  const isGray = Math.abs(rgbColor.red - rgbColor.green) < grayThreshold
  && Math.abs(rgbColor.green - rgbColor.blue) < grayThreshold
  && Math.abs(rgbColor.blue - rgbColor.red) < grayThreshold;

  const whiteThreshold = 240;
  const blackThreshold = 15;

  return ((rgbColor.red >= whiteThreshold && rgbColor.blue >= whiteThreshold && rgbColor.blue >= whiteThreshold)
  || (rgbColor.red <= blackThreshold && rgbColor.green <= blackThreshold && rgbColor.blue <= blackThreshold)
  || isGray);
}

export function getNormalizedBorderRadius(borderRadiusStr: string): number {
  const match = borderRadiusStr.match(/^\d+/);
  if (match && !Number.isNaN(+match[0])) {
    const br = +match[0];
    if (br < DEFAULT_BORDER_RADIUS) return DEFAULT_BORDER_RADIUS;
    return br;
  }
  return DEFAULT_BORDER_RADIUS;
}

export function sanitizeUrlsInCssStr(urls: string[]) {
  return urls
    .map(match => match.replace(/url\("(.*?)"\)|url\('(.*?)'\)|url\((.*?)\)/, "$1$2$3"));
}

export function getUrlsFromSrcset(srcset: string): string[] {
  return srcset
    .split(",")
    .map(src => src.trim())
    .map(src => src.split(" ")[0]) // [url, width/density descriptor (2x OR 400w)] <- get url
    .filter(Boolean);
}
