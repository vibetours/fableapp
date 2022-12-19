export function captureVisibleTab(): Promise<string> {
  return chrome.tabs.captureVisibleTab({
    format: "png",
  });
}

export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (tabs && tabs.length >= 1) {
    return tabs[0];
  }

  return null;
}
