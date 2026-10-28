// The headless reads load game.playbracco.com like a visitor, so the site's ad and analytics tags fired
// on every read (every 3 minutes): fake page views and sessions in Bracco's ad and analytics data.
// Abort those requests before they leave the browser. The odds come from Bracco's own endpoints,
// which this list never matches.
const TRACKERS = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|googleadservices\.com|doubleclick\.net|google\.[a-z.]+\/(pagead|rmkt|ccm|measurement)|googlesyndication\.com|analytics\.twitter\.com|ads-twitter\.com|static\.ads-twitter\.com|t\.co\/1\/i\/adsct|appsflyer(sdk)?\.com|quantserve\.com|quantcount\.com|facebook\.(com|net)|connect\.facebook|tiktok\.com|snapchat\.com|clarity\.ms|hotjar\.com|segment\.(io|com)|posthog\.com|mixpanel\.com|amplitude\.com|bing\.com\/action|reddit\.com\/(pixel|rp)|customer\.io|nsureapi\.com/i;

export async function blockTrackers(page) {
  await page.route(url => TRACKERS.test(url.href), route => route.abort());
}
