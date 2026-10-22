// Scenario and step data for the generic diagrams on the core concepts page.
import type { Scenario, Step } from './types'

export const cachingActors = ['Browser', 'HTTP cache', 'CDN edge', 'Origin']

export const cachingScenarios: Scenario[] = [
  {
    name: 'First visit',
    messages: [
      { from: 0, to: 1, label: 'Have /app.css?', note: 'Before any network request, the browser checks its own HTTP cache.' },
      { from: 1, to: 0, label: 'Miss', note: 'Nothing stored yet, so the request has to go out.', dashed: true },
      { from: 0, to: 2, label: 'GET /app.css', note: 'DNS sends the request to the nearest CDN edge, not to your origin server.' },
      { from: 2, to: 3, label: 'GET /app.css (edge miss)', note: 'The edge has no copy either, so it asks the origin once on behalf of everyone near it.' },
      { from: 3, to: 2, label: '200 · max-age=600 · ETag "v7"', note: 'The origin replies with the file, a freshness lifetime (TTL) of 600 seconds, and an ETag: a fingerprint of this version.', dashed: true },
      { from: 2, to: 0, label: '200 (edge keeps a copy)', note: 'The edge stores the file, so the next user in this region skips the origin.', dashed: true },
      { from: 0, to: 1, label: 'Store for 600 s', note: 'The browser stores the response with its headers. The clock on the TTL starts now.' },
    ],
  },
  {
    name: 'Within the TTL',
    messages: [
      { from: 0, to: 1, label: 'Have /app.css?', note: 'Two minutes later, the user opens another page that needs the same file.' },
      { from: 1, to: 0, label: 'Hit, fresh (age 120 s < 600 s)', note: 'Served straight from disk or memory. No request at all: DevTools shows "(disk cache)". This is memoisation applied to files.', dashed: true },
    ],
  },
  {
    name: 'Expired, unchanged',
    messages: [
      { from: 0, to: 1, label: 'Have /app.css?', note: 'An hour later the stored copy is past its TTL. It is stale, but probably still correct.' },
      { from: 1, to: 0, label: 'Stale: revalidate', note: 'Instead of downloading again, the browser asks whether its copy is still current.', dashed: true },
      { from: 0, to: 2, label: 'GET · If-None-Match: "v7"', note: 'A conditional request: "send the body only if the ETag is no longer v7".' },
      { from: 2, to: 0, label: '304 Not Modified (no body)', note: 'The file has not changed, so the reply has headers only: a few hundred bytes instead of the whole file.', dashed: true },
      { from: 0, to: 1, label: 'Reuse copy, reset TTL', note: 'The stored copy is fresh again for another 600 seconds.' },
    ],
  },
  {
    name: 'Expired, changed',
    messages: [
      { from: 0, to: 1, label: 'Have /app.css?', note: 'The stored copy is stale, and this time a deploy has changed the file.' },
      { from: 1, to: 0, label: 'Stale: revalidate', note: 'Same conditional request as before.', dashed: true },
      { from: 0, to: 2, label: 'GET · If-None-Match: "v7"', note: 'The browser still offers its old ETag.' },
      { from: 2, to: 0, label: '200 · new body · ETag "v8"', note: 'The ETag no longer matches, so the full new file comes back with a new fingerprint.', dashed: true },
      { from: 0, to: 1, label: 'Replace stored copy', note: 'This is cache invalidation: the old entry is replaced by the new version.' },
    ],
  },
  {
    name: 'Hashed file name',
    messages: [
      { from: 0, to: 1, label: 'Have app.4f3a9c.js?', note: 'Build tools such as Vite put a content hash in each file name, and serve it with Cache-Control: max-age=31536000, immutable.' },
      { from: 1, to: 0, label: 'Hit, immutable for a year', note: 'No revalidation ever. When the code changes, the name changes (app.9b21e0.js), so the new file is a cache miss by design. Only index.html is no-cache, so it always points to the latest names.', dashed: true },
    ],
  },
]

export const negotiationActors = ['Browser', 'CDN / server']

export const negotiationScenarios: Scenario[] = [
  {
    name: 'Brotli',
    messages: [
      { from: 0, to: 1, label: 'GET /app.js · Accept-Encoding: br, gzip', note: 'The browser lists the compression formats it can decode. Every modern browser sends this automatically over HTTPS.' },
      { from: 1, to: 1, label: 'Pick best match: br', note: 'The server compares that list with the encodings it has. Brotli usually compresses JS and CSS 15 to 20% smaller than gzip.' },
      { from: 1, to: 0, label: '200 · Content-Encoding: br · 95 KB', note: 'It labels the response so the browser knows how to decode it. Vary: Accept-Encoding tells caches to store one copy per encoding.', dashed: true },
      { from: 0, to: 0, label: 'Decompress → 410 KB', note: 'Decompressing is far cheaper than downloading the extra 315 KB, especially on mobile networks.' },
    ],
  },
  {
    name: 'Gzip only',
    messages: [
      { from: 0, to: 1, label: 'GET /app.js · Accept-Encoding: gzip', note: 'An older client or a proxy that only understands gzip.' },
      { from: 1, to: 1, label: 'Pick best match: gzip', note: 'The server falls back to the best option the client accepts.' },
      { from: 1, to: 0, label: '200 · Content-Encoding: gzip · 120 KB', note: 'Slightly bigger than Brotli, still about 70% smaller than the original.', dashed: true },
    ],
  },
  {
    name: 'Image format',
    messages: [
      { from: 0, to: 1, label: 'GET /hero · Accept: image/avif, image/webp', note: 'Negotiation is not just compression. The Accept header lists the media types the browser can show.' },
      { from: 1, to: 1, label: 'Pick AVIF (45 KB vs 180 KB JPEG)', note: 'Image CDNs pick the smallest format the browser supports. On your own pages, <picture> with <source type> does the same in HTML.' },
      { from: 1, to: 0, label: '200 · Content-Type: image/avif · Vary: Accept', note: 'Smaller hero image means a faster LCP.', dashed: true },
    ],
  },
  {
    name: 'Language',
    messages: [
      { from: 0, to: 1, label: 'GET / · Accept-Language: ga-IE, en;q=0.8', note: 'The q value is a weight: Irish first, English as a fallback.' },
      { from: 1, to: 1, label: 'No Irish version: use en', note: 'The server picks the best language it actually has.' },
      { from: 1, to: 0, label: '200 · Content-Language: en', note: 'Store the user\'s explicit choice too, because the header only reflects browser settings.', dashed: true },
    ],
  },
]

export const ssrActors = ['Browser', 'Web server', 'API / database']

export const ssrScenarios: Scenario[] = [
  {
    name: 'Client-side rendering',
    messages: [
      { from: 0, to: 1, label: 'GET /product/42', note: 'The user follows a link to a product page.' },
      { from: 1, to: 0, label: '<div id="root"></div>', note: 'The HTML is an empty shell. First paint shows nothing useful: the white screen.', dashed: true },
      { from: 0, to: 1, label: 'GET /assets/app.js', note: 'The browser must now download the whole app bundle.' },
      { from: 1, to: 0, label: 'React + app code', note: 'On a slow phone, parsing and running this can take seconds.', dashed: true },
      { from: 0, to: 0, label: 'createRoot().render()', note: 'React renders a loading state, then an effect starts fetching data.' },
      { from: 0, to: 2, label: 'fetch /api/product/42', note: 'A second round trip, from the user\'s device, which may be far from the API.' },
      { from: 2, to: 0, label: 'JSON', note: 'The data finally arrives.', dashed: true },
      { from: 0, to: 0, label: 'Render content', note: 'Only now does the user see the product. It is interactive at the same moment.' },
    ],
  },
  {
    name: 'SSR + hydration',
    messages: [
      { from: 0, to: 1, label: 'GET /product/42', note: 'Same request.' },
      { from: 1, to: 2, label: 'fetch product 42', note: 'The server fetches data next to the database: a fast hop inside the data centre.' },
      { from: 2, to: 1, label: 'JSON', note: 'Data arrives in milliseconds.', dashed: true },
      { from: 1, to: 1, label: 'renderToPipeableStream(<App/>)', note: 'React runs on the server and produces HTML. With streaming, it can send the head and shell before slow parts finish.' },
      { from: 1, to: 0, label: 'Full HTML + serialised data', note: 'The data is embedded so the client does not fetch it again.', dashed: true },
      { from: 0, to: 0, label: 'Paint content (FCP, LCP)', note: 'Content is visible immediately. But buttons do nothing yet: no JS has run.' },
      { from: 0, to: 1, label: 'GET /assets/app.js', note: 'The same component code still has to download.' },
      { from: 1, to: 0, label: 'React + app code', note: 'This is the cost SSR does not remove.', dashed: true },
      { from: 0, to: 0, label: 'hydrateRoot(): attach handlers', note: 'Hydration: React renders in memory, matches its tree to the existing DOM, and attaches event listeners. Now it is interactive.' },
    ],
  },
]

export const criticalCssSteps: Step[] = [
  { title: 'All your CSS', sub: 'files, modules, CSS-in-JS', detail: 'In a big app the stylesheet can be hundreds of KB, and all of it is render-blocking.' },
  { title: 'Build plugin', sub: 'Beasties, critical', detail: 'After the build, a plugin takes over each generated HTML page.' },
  { title: 'Headless render', sub: 'at set viewports', detail: 'It renders the page in a headless browser (or parses the HTML) at the viewport sizes you configure, such as 375 × 812 and 1440 × 900.' },
  { title: 'Collect used rules', sub: 'above the fold only', detail: 'It records which selectors match elements visible above the fold.' },
  { title: 'Inline critical', sub: '<style> in <head>', detail: 'Those rules go into a <style> tag in the HTML. No extra request, so the first paint does not wait for the network. Keep it under about 14 KB so it fits in the first round trip.' },
  { title: 'Defer the rest', sub: 'preload, then apply', detail: 'The full stylesheet still loads, but without blocking render. It arrives before the user scrolls, and is cached for the next page.' },
]

export const hydrationSteps: Step[] = [
  { title: 'HTML arrives', sub: 'visible, inert', detail: 'The server-rendered markup paints. Links work, but React event handlers do not exist yet.' },
  { title: 'JS downloads', sub: 'same components', detail: 'The browser fetches the code for the components it just rendered as HTML.' },
  { title: 'Render in memory', sub: 'with the same data', detail: 'React renders the tree again on the client, using the data the server embedded in the page.' },
  { title: 'Match the DOM', sub: 'node by node', detail: 'Instead of creating DOM nodes, React walks the existing ones and checks they match. If they differ, you get a hydration mismatch error and React may re-render that part.' },
  { title: 'Attach listeners', sub: 'onClick, onChange', detail: 'React attaches its event handlers to the existing nodes. Effects (useEffect) run now, never on the server.' },
  { title: 'Interactive', sub: 'TTI', detail: 'The page now behaves like a normal client-rendered app. With Suspense boundaries, React hydrates parts independently and prioritises the part the user clicks.' },
]
