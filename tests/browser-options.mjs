// CI uses Playwright's pinned Chromium. Developers may reuse installed Chrome.
export function browserOptions() {
  if (process.env.CHROME_PATH) return { executablePath: process.env.CHROME_PATH };
  if (process.env.PLAYWRIGHT_BROWSER === 'chromium') return {};
  return { channel: 'chrome' };
}
