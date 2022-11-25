export function getRandomId(): string {
  return (
    Math.random().toString(16).substring(2, 15)
    + Math.random().toString(16).substring(2, 15)
  );
}

export function isCrossOrigin(url1: string, url2: string): boolean {
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
