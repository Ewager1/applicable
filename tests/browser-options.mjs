// CI uses Playwright's pinned Chromium. Developers may reuse installed Chrome.
export function browserOptions() {
  if (process.env.CHROME_PATH) return { executablePath: process.env.CHROME_PATH };
  // The full Chromium/new headless mode includes the native PDF viewer.
  if (process.env.PLAYWRIGHT_BROWSER === 'chromium') return { channel: 'chromium' };
  return { channel: 'chrome' };
}
