export function isSameOrigin(origin1: string, origin2: string): boolean {
  const url1 = new URL(origin1);
  const url2 = new URL(origin2);

  return url1.host === url2.host;
}
