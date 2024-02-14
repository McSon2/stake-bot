let browserInstance = null;

export function setBrowserInstance(browser) {
  browserInstance = browser;
}

export function getBrowserInstance() {
  return browserInstance;
}
