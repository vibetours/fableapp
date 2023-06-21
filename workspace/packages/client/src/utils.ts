export function isBodyEl(el: HTMLElement): boolean {
  return !!(el && el.tagName && el.tagName.toLowerCase() === 'body');
}

export function openTourExternalLink(uri: string) {
  const url = new URL(uri);
  const sharefableUrl = new URL(process.env.REACT_APP_CLIENT_ENDPOINT as string);

  if (url.host === sharefableUrl.host) {
    window.open(uri, '_self');
  } else {
    window.open(uri, '_blank')?.focus();
  }
}
