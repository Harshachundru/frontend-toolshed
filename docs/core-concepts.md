<script setup>
import {
  cachingActors, cachingScenarios,
  negotiationActors, negotiationScenarios,
  ssrActors, ssrScenarios,
  criticalCssSteps, hydrationSteps,
} from './.vitepress/theme/concepts/data'
</script>

# 15 core frontend concepts

Every framework is built on the same browser, network and data ideas. Learn these 15 and a new library becomes a question of "which of these does it implement, and how?". Each section says what the idea is in one line, the problem it solves, and the fix. Then it gives an interactive diagram, a worked example, and the React and TypeScript tools that implement it.

The concepts build on each other. Most of them come back to the first one: how the browser turns bytes into pixels.

| # | Concept | Group | Builds on |
| --- | --- | --- | --- |
| 1 | [Critical rendering path](#_1-critical-rendering-path) | Browser | – |
| 2 | [Core Web Vitals](#_2-core-web-vitals) | Browser | 1 |
| 3 | [HTTP caching](#_3-http-caching) | Network | 1 |
| 4 | [Content negotiation](#_4-content-negotiation) | Network | 3 |
| 5 | [Lazy loading](#_5-lazy-loading) | Loading | 1, 2 |
| 6 | [Bundle splitting](#_6-bundle-splitting) | Loading | 3, 5 |
| 7 | [Critical CSS](#_7-critical-css) | Loading | 1 |
| 8 | [Essential state](#_8-essential-state) | Data | – |
| 9 | [Reducer pattern](#_9-reducer-pattern) | Data | 8 |
| 10 | [Windowing](#_10-windowing) | Runtime | 2 |
| 11 | [Server-side rendering](#_11-server-side-rendering) | Rendering | 1, 2 |
| 12 | [Hydration](#_12-hydration) | Rendering | 11 |
| 13 | [Partial prerendering](#_13-partial-prerendering) | Rendering | 3, 11, 12 |
| 14 | [Server components](#_14-server-components) | Rendering | 6, 12 |
| 15 | [Micro frontends](#_15-micro-frontends) | Architecture | 6, 9 |

::: tip How to explain any of these in an interview
Start with the browser mechanism, then name a framework as one implementation of it. "CSS is render-blocking, so we inline the above-the-fold rules" beats "we use Next.js".
:::

## 1. Critical rendering path

The critical rendering path is every step the browser takes between receiving a page and showing its first pixels.

### The steps

- **Build the DOM:** The browser reads the HTML and turns it into a tree of elements.
- **Build the CSSOM:** It reads the CSS and turns it into a tree of style rules.
- **Combine them:** It merges the two into a render tree, which holds only the visible elements, each with its styles.
- **Style, layout, paint, composite:** It works out each element's size and position, fills in the pixels, and stacks the layers onto the screen.

### The problem: things that block the path

- **CSS blocks rendering:** The browser shows nothing until every stylesheet in `<head>` has downloaded, because any rule could change how the first element looks.
- **Scripts block parsing:** A plain `<script>` stops the HTML reader until the script downloads and runs, because the script might change the page.

### The fix: shorten the path

- Keep CSS small, so it arrives fast.
- Load scripts with `type="module"` or `defer`, so they don't stop the HTML reader.
- Tell the browser early about what it will need, such as the hero image, with `preload`.

<CrpDiagram />

### Example

```html
<head>
  <!-- Discover the hero image early: it is probably the LCP element -->
  <link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
  <link rel="preconnect" href="https://api.example.com">
  <link rel="stylesheet" href="/app.4f3a.css">           <!-- render-blocking, keep it small -->
  <script type="module" src="/app.9b21.js"></script>     <!-- deferred by default -->
</head>
<body>
  <h1>Trail shoes</h1>                                    <!-- can paint as soon as CSS is ready -->
</body>
```

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| `preload`, `preinit`, `preconnect` from `react-dom` (React 19) | Ask the browser to fetch fonts, styles and scripts early, from any component |
| `<link>`, `<title>`, `<meta>` in components (React 19) | React hoists them into `<head>`, so components can declare what they need |
| Vite or Next.js | Emit `type="module"` scripts and hashed, minified CSS and JS |
| `PerformanceObserver` with `PerformancePaintTiming` | Read FCP in code; the DOM types in `lib.dom.d.ts` type each entry |
| Chrome DevTools Performance panel | Shows parse, style, layout, paint and composite for a real load |

**In an interview:** "The browser needs the DOM and CSSOM before it can build the render tree and paint. I shorten that path by keeping CSS small, deferring scripts, and making the first content discoverable in the HTML."

## 2. Core Web Vitals

Core Web Vitals are three scores Google uses to judge how a page feels to real users.

### The three scores

- **LCP (Largest Contentful Paint):** How long until the biggest thing on screen, usually the hero image or main heading, appears. Good is 2.5 s or less. Poor is over 4 s.
- **INP (Interaction to Next Paint):** How long the page takes to react visibly after a click, tap or key press. Good is 200 ms or less. Poor is over 500 ms.
- **CLS (Cumulative Layout Shift):** How much content jumps around while you read it. Good is 0.1 or less. Poor is over 0.25.

LCP is measured during the first load. INP and CLS are measured for the whole visit.

### What makes each one bad

- **Slow LCP:** The critical rendering path (concept 1) takes too long, so the main content paints late.
- **Bad CLS:** Something arrives late and pushes content down, such as an image with no size, a web font or a cookie banner. Shifts within 500 ms of your own click don't count, because you expected them.
- **Slow INP:** After a click, too much work happens before the next frame: the event handler, the state update, React re-rendering, then the browser's layout and paint.

<WebVitalsDemo />

### Example

```ts
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals'

function report(metric: Metric) {
  // Send field data, not lab data: real devices and networks
  navigator.sendBeacon('/analytics', JSON.stringify({
    name: metric.name, value: metric.value, rating: metric.rating, page: location.pathname,
  }))
}

onLCP(report)
onINP(report)
onCLS(report)
```

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| `web-vitals` library | Measures LCP, INP and CLS the same way Chrome does; ships TypeScript types (`Metric`) |
| `useTransition`, `useDeferredValue` | Mark slow updates as non-urgent so React paints the click response first (INP) |
| `<Profiler onRender>` and React DevTools Profiler | Find components that re-render slowly |
| `next/image`, or `width`, `height` and `aspect-ratio` | Reserve space for images (CLS) and prioritise the LCP image |
| Lighthouse, PageSpeed Insights, Chrome UX Report | Lab audits and real-user field data |

**In an interview:** "LCP and CLS describe the initial render, INP describes every re-render after it. I track all three from real users with `web-vitals`, then fix the worst one first."

## 3. HTTP caching

Caching means keeping a copy of a file so you don't have to download it again.

### The problem: downloading the same file twice

- Every visit asks the server for the same logo, CSS and JavaScript.
- Each request costs a network round trip, and big files cost download time.

### The fix: tell the browser how long to keep it

- **`Cache-Control`:** A response header that says how long the copy stays fresh, for example `max-age=3600` for one hour. That time is the TTL (time to live).
- **Revalidation:** When the copy goes stale, the browser doesn't blindly download it again. It sends the `ETag` it stored, a fingerprint of the file, and asks "has this changed?".
- **`304 Not Modified`:** If the file hasn't changed, the server sends this tiny reply with no body, and the browser reuses its copy.

### The CDN: a cache near the user

- A CDN is a network of servers around the world that keep copies of your static files.
- A user in Dublin gets the file from a server in Dublin, not from your origin server in Virginia.
- It also compresses files for you. For most apps it is the biggest single speed win.

<SequenceDiagram
  title="Browser cache, CDN and origin"
  hint="Pick a scenario, then step through it."
  :actors="cachingActors"
  :scenarios="cachingScenarios"
/>

### Example

| File | Header | Why |
| --- | --- | --- |
| `index.html` | `Cache-Control: no-cache` | Always revalidate, so users get links to the newest assets |
| `app.4f3a9c.js` | `Cache-Control: public, max-age=31536000, immutable` | The hash changes with the content, so the name never points at stale code |
| `/api/products` | `Cache-Control: private, max-age=0, must-revalidate` + `ETag` | Personal data: never in shared caches, always checked |
| `/avatars/42.png` | `Cache-Control: max-age=86400, stale-while-revalidate=604800` | Show the old avatar instantly and refresh in the background |

`max-age` is in **seconds**, not milliseconds.

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| Vite and webpack content hashes | Put `[hash]` in file names so assets can be cached for a year |
| TanStack Query `staleTime` and `gcTime`, SWR | The same TTL and revalidation idea for API data inside the app |
| `stale-while-revalidate` | SWR is named after this header and follows the same idea |
| `useMemo`, `React.memo`, `cache()` (server components) | Memoisation at component and request level |
| Workbox or a service worker | Programmable cache for offline and repeat visits |
| A typed `fetch` wrapper (`async function getJson<T>(url: string): Promise<T>`) | One place to add caching headers and parse responses safely |

**In an interview:** "I cache hashed assets for a year as immutable, serve HTML with `no-cache`, and let a CDN hold copies near users. Revalidation with `ETag` turns a full download into a tiny 304."

## 4. Content negotiation

Content negotiation lets one URL send each visitor the best version of a file for their browser.

### The problem: one file doesn't suit everyone

- Newer browsers support smaller image formats such as AVIF. Older ones don't.
- Some browsers support better compression (Brotli). Some only support gzip.
- Users read different languages.

### The fix: the browser asks, the server picks

- **The browser lists what it accepts** in request headers, such as `Accept-Encoding: br, gzip`.
- **The server picks the best match** and labels the response, such as `Content-Encoding: br`.
- **The server adds `Vary`** with the header it used, so caches keep a separate copy of each version.

| Request header | Response header | Chooses |
| --- | --- | --- |
| `Accept-Encoding: br, gzip` | `Content-Encoding: br` | Compression |
| `Accept: image/avif, image/webp` | `Content-Type: image/avif` | Format |
| `Accept-Language: ga-IE, en;q=0.8` | `Content-Language: en` | Language |

### Why compression pays

- Unpacking a small file on the device is much faster than downloading a big one.
- Brotli (`br`) usually makes text smaller than gzip.

<SequenceDiagram
  title="One URL, the best version for each client"
  :actors="negotiationActors"
  :scenarios="negotiationScenarios"
/>

### Example

```html
<!-- Format negotiation in HTML: the browser takes the first type it supports -->
<picture>
  <source srcset="/hero.avif" type="image/avif">
  <source srcset="/hero.webp" type="image/webp">
  <img src="/hero.jpg" alt="Runner on a trail" width="1200" height="675">
</picture>
```

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| CDN (Cloudflare, Fastly, CloudFront, Vercel) | Compresses with Brotli and gzip, and converts images, automatically |
| `vite-plugin-compression2` | Pre-compress `.br` and `.gz` files at build time for static hosting |
| `next/image` or an image CDN | Serves AVIF or WebP based on `Accept` |
| `fetch(url, { headers: { Accept: 'application/json' } })` | Ask an API for a specific representation |
| `Intl` APIs and `navigator.languages` | Format and choose language on the client |

**In an interview:** "The client says what it can handle, the server picks the best match and sets `Vary`. In practice the CDN does this, so I check the response headers in DevTools to confirm `content-encoding: br`."

## 5. Lazy loading

Lazy loading means downloading something only when the user is about to need it.

### The problem: eager loading

- Eager loading downloads everything up front: every image, every modal, every chart library.
- All of it competes with what the user needs to see first, so the first view is slower.

### The fix: wait until it's needed

- **Images and iframes below the fold:** Add `loading="lazy"`. The browser fetches them only when the user scrolls near them.
- **JavaScript:** Use a dynamic `import()`. A normal `import` goes into the main file at build time. A dynamic `import()` tells the bundler to put that code in a separate file, a chunk, that downloads only when the code runs.

### The catch

- The user waits a moment the first time they open a lazy thing. Hide the wait by prefetching on hover.
- Never lazy-load the LCP image. It is above the fold and must load first.

<LazyLoadDemo />

### Example

```tsx
import { lazy, Suspense, useState } from 'react'

// A separate chunk, fetched the first time <ReportModal> renders
const ReportModal = lazy(() => import('./ReportModal'))

export function Toolbar() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Export report</button>
      {open && (
        <Suspense fallback={<Spinner />}>
          <ReportModal onClose={() => setOpen(false)} />
        </Suspense>
      )}
      <img src="/team.avif" loading="lazy" width="800" height="450" alt="The team" />
    </>
  )
}
```

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| `React.lazy` + `<Suspense>` | Lazy components with a fallback while the chunk loads |
| Dynamic `import()` | TypeScript keeps full types: `import('./x')` returns `Promise<typeof import('./x')>` |
| `loading="lazy"` on `<img>` and `<iframe>` | Native lazy loading, no JS needed |
| `IntersectionObserver`, `react-intersection-observer` | Load or render when an element nears the viewport |
| Prefetch on hover or intent (`<link rel="prefetch">`, router prefetch) | Hide the lazy-load delay before the user clicks |

**In an interview:** "Anything not needed for the first view is a candidate: below-the-fold images, modals, charts, editors. I use `import()` behind `React.lazy` and prefetch on hover so the user never waits."

## 6. Bundle splitting

Bundle splitting cuts your app's JavaScript into smaller files, so each page downloads only the code it uses. It is lazy loading applied to the whole app.

### The problem: one giant bundle

- A bundler such as Vite or webpack combines all your code files into one file, the bundle.
- Without splitting, opening the login page downloads the code for the dashboard, settings and reports too.
- Every deploy changes that one file, so every user downloads all of it again.

### The fix: split by route and by vendor

- **Route chunks:** Each page gets its own file. The login page loads only the login code.
- **Vendor chunk:** Libraries such as React go in their own file. They rarely change, so that file stays in the browser cache (concept 3) across your deploys.

<BundleSplitDemo />

### Example

```tsx
import { createBrowserRouter } from 'react-router'

// Each `lazy` route becomes its own chunk
export const router = createBrowserRouter([
  { path: '/', lazy: () => import('./routes/home') },
  { path: '/login', lazy: () => import('./routes/login') },
  { path: '/dashboard', lazy: () => import('./routes/dashboard') },
])
```

```ts
// vite.config.ts: keep slow-changing libraries in their own long-cached chunk
export default defineConfig({
  build: {
    rollupOptions: {
      output: { manualChunks: { vendor: ['react', 'react-dom', 'react-router'] } },
    },
  },
})
```

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| React Router `lazy` routes, TanStack Router `lazyRouteComponent` | Route-level splitting |
| Next.js, Remix, React Router framework mode | Split per route automatically |
| Vite `manualChunks`, webpack `splitChunks` | Control vendor and shared chunks |
| `rollup-plugin-visualizer`, `webpack-bundle-analyzer`, `source-map-explorer` | See what is in each chunk |
| `size-limit` in CI | Fail the build when a chunk grows past a budget |

**In an interview:** "I split by route first, then pull heavy widgets out with `import()`. Vendor code goes in its own chunk so a feature deploy does not invalidate React in everyone's cache."

## 7. Critical CSS

Critical CSS is a speed technique that makes the top of a page appear sooner.

### The problem: render-blocking CSS

- **Above the fold:** The part of a page you see without scrolling, such as the header, main title and top banner.
- **Render-blocking:** The browser shows nothing until it has downloaded and read every stylesheet.
- **The delay:** If your CSS file is large, the user stares at a blank screen for longer.

### The fix: inline the critical part, defer the rest

- **Step 1, inline:** Take only the rules needed for the above-the-fold part and put them inside a `<style>` tag in the HTML `<head>`. They arrive with the HTML, so the browser can draw the top of the page without waiting for another file.
- **Step 2, defer:** Load the full stylesheet in the background, so it doesn't block the first paint.

### Why mobile and desktop differ

- **Different fold:** What fits above the fold depends on the screen.
- **Different layout:** On a tall desktop monitor, the navigation, a sidebar and a big hero image might all be visible at once. On a phone, the same elements stack vertically and get pushed down. Less content is visible, so a different, smaller set of rules is critical.

<StepFlow title="How a build extracts critical CSS" :steps="criticalCssSteps" />

<CriticalCssDemo />

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| Beasties (the maintained fork of Critters) | Inlines critical CSS during the build; used by Angular, Nuxt and Next.js `optimizeCss` |
| `critical` (built on Penthouse) | Headless-browser extraction at set viewport sizes |
| Next.js, Remix with CSS Modules | Collect only the CSS each route uses |
| Tailwind CSS | Generates only the classes you use, so the whole file is often small enough to inline |
| Zero-runtime CSS-in-JS (vanilla-extract, Panda, Linaria) | Static CSS files with typed styles, no runtime style injection |

**In an interview:** "CSS blocks rendering by design. For large sites I inline the above-the-fold rules, roughly under 14 KB so they fit in the first network round trip, and defer the rest. Usually a build plugin does it, and I verify with a filmstrip in WebPageTest."

## 8. Essential state

Essential state is the smallest set of values you need to store to draw the screen. You calculate everything else from them.

### The problem: storing things you could calculate

- If you store `price`, `qty` and also `total`, you have to keep `total` in sync by hand.
- Forget once, and the screen shows a total that doesn't match the price.
- Each extra stored value is another bug to cause, another case to test, and another re-render.

### The fix: store the inputs, derive the rest

- **Ask what the user or the server gives you:** Those values are state. In a receipt, that's price, quantity, discount rate, shipping and tax rate.
- **Calculate everything else during render:** Subtotal, tax and total are arithmetic on that state. They can't drift, because React recomputes them on every render.

<EssentialStateDemo />

### Example

```tsx
type Cart = { price: number; qty: number; discountRate: number; shipping: number; taxRate: number }

function Receipt({ cart }: { cart: Cart }) {
  // Derived in render: no useState, no useEffect, cannot drift
  const discounted = cart.price * (1 - cart.discountRate)
  const subtotal = discounted * cart.qty
  const tax = subtotal * cart.taxRate
  const total = subtotal + tax + cart.shipping
  return <Totals subtotal={subtotal} tax={tax} total={total} />
}
```

A useful test: if you write `useEffect(() => setX(f(y)), [y])`, then `x` is not state. Compute it.

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| Compute in render | The default. Derived values need no hook |
| `useMemo` | Cache a derived value only when it is expensive to compute |
| Selectors (Redux `createSelector`, Zustand selectors) | Derive and memoise from a global store |
| URL search params | Filters, tabs and pages are often state the URL should own |
| TypeScript discriminated unions | `{ status: 'loading' } \| { status: 'success'; data: T }` stops impossible states such as loading and an error at once |
| `Readonly<T>`, `as const` | Make it clear that derived data is not to be edited |

**In an interview:** "I look for the minimum inputs first: here, product, discount rate, shipping and tax rate. Subtotal, tax and total are derived, so they cannot disagree."

## 9. Reducer pattern

A reducer is one function that decides how state changes. It takes the current state and a note of what happened, and returns the new state.

### The problem: state changed from everywhere

- One event, such as a privacy toggle that hides amounts, has to change many parts of a dashboard.
- Without a central place, each component updates its own piece, through chains of effects or props passed down many levels (prop drilling).
- When something goes wrong, you can't tell which component changed what.

### The fix: send messages to one function

- **Action:** Components don't change state. They dispatch an action, a plain object that says what happened, such as `{ type: 'privacy/toggled' }`.
- **Reducer:** One pure function, `(state, action) => newState`, works out the next state. Pure means it uses only its inputs and changes nothing outside itself.
- **Subscribe:** Components read the parts of state they need and re-render when those change.

### Why it's easy to trust

- The same state and the same action always give the same result, so each test is a single line.
- Actions are a list of messages, so you can log them, replay them and step back through them.

<ReducerDemo />

### Example

```ts
type State = Readonly<{ privacy: boolean; currency: 'EUR' | 'USD'; amounts: readonly number[] }>

type Action =
  | { type: 'privacy/toggled' }
  | { type: 'currency/set'; currency: State['currency'] }
  | { type: 'transaction/added'; amount: number }

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'privacy/toggled':
      return { ...state, privacy: !state.privacy }
    case 'currency/set':
      return { ...state, currency: action.currency }      // narrowed: `currency` exists here
    case 'transaction/added':
      return { ...state, amounts: [...state.amounts, action.amount] }
    default: {
      const unhandled: never = action                      // compile error if a case is missing
      return unhandled
    }
  }
}

// In a component: const [state, dispatch] = useReducer(reducer, initialState)
```

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| `useReducer` + Context | Built-in reducer for a subtree |
| Redux Toolkit (`createSlice`, Immer inside) | Reducers with less boilerplate, DevTools time travel |
| Zustand, XState | Smaller stores, and state machines for complex flows |
| TypeScript discriminated unions + `never` | Every action is typed, every case is checked |
| `Readonly`, `readonly` arrays | Catch accidental mutation at compile time |

**In an interview:** "Libraries change; the pattern does not. Redux, Zustand and `useReducer` all route events through a pure function. I ask how a new library handles immutability, subscriptions and async before learning its API."

## 10. Windowing

Windowing, also called virtualisation, draws only the list rows you can see, not the whole list.

### The problem: too many elements

- A feed of 10,000 items normally puts 10,000 sets of elements in the page.
- That uses memory and makes every layout slower, so clicks feel laggy (INP) even when nothing heavy happens.

### The fix: render a moving window

- **Only visible rows exist:** The page holds a few dozen rows at a time.
- **A tall spacer:** An empty element as tall as the full list keeps the scrollbar the right size.
- **Rows swap as you scroll:** Rows that leave the view are removed and new ones are added.
- **Overscan:** A few extra rows above and below the view stop gaps from flashing when you scroll fast.

<WindowingDemo />

### Example

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function Feed({ posts }: { posts: Post[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  })

  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div key={row.key} style={{ position: 'absolute', top: 0, width: '100%', transform: `translateY(${row.start}px)` }}>
            <PostCard post={posts[row.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

For infinite scroll, put a sentinel element at the end of the list and load the next page when an `IntersectionObserver` reports it visible.

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| TanStack Virtual | Headless, typed, supports variable row heights and grids |
| `react-window`, `react-virtuoso` | Ready-made list and grid components |
| `IntersectionObserver` | Detect when an element enters or leaves the viewport |
| CSS `content-visibility: auto` | Lets the browser skip rendering off-screen sections, with no JS |
| `useDeferredValue` | Keep typing smooth while a filtered list re-renders |

**In an interview:** "In a news feed design question I say windowing early. I also mention its costs: Ctrl+F cannot find unmounted rows, and screen readers need correct `aria-setsize` and `aria-posinset`."

## 11. Server-side rendering

Server-side rendering (SSR) builds the page's HTML on the server, so the browser gets a finished page instead of an empty one.

### The problem: the blank screen of client-side rendering

- With client-side rendering (CSR), the server sends an almost empty page: just `<div id="root">`.
- The browser must download the JavaScript, run it and fetch the data before anything appears.
- On a slow phone that means seconds of blank screen. Search engines also see an empty page.

### The fix: render on the server

- The server runs your components, fetches data next to the database, and sends finished HTML.
- Content appears as soon as the HTML and CSS arrive, so FCP and LCP improve.

### The catch

- The page looks ready but isn't clickable until hydration finishes (concept 12).
- You need a server, not just static file hosting.

<SequenceDiagram
  title="Client-side rendering compared with SSR"
  :actors="ssrActors"
  :scenarios="ssrScenarios"
/>

<RenderingTimeline />

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| Next.js, React Router framework mode (formerly Remix), TanStack Start | SSR frameworks with routing and data loading |
| `renderToPipeableStream` (Node), `renderToReadableStream` (edge) | React's streaming SSR APIs |
| `<Suspense>` boundaries | Stream the shell first, slow sections later |
| Typed loaders (`Route.LoaderArgs`, `useLoaderData<typeof loader>()`) | Server data and component props share one TypeScript type |
| Static site generation (SSG) | Render at build time for pages that do not change per request |

**In an interview:** "SSR moves the first render to the server to fix the white screen. It speeds up LCP but not interactivity, because the same JS still has to hydrate."

## 12. Hydration

Hydration is the step that makes server-rendered HTML clickable.

### The problem: HTML with no behaviour

- SSR sends HTML that looks finished, but HTML on its own has no click handlers.
- Until React attaches them, buttons look ready but do nothing. Users click again and again, which is called rage clicking.

### The fix: React renders again and attaches handlers

- React downloads the component code.
- It renders the tree again in memory, with the same data the server used.
- It matches the result to the HTML already on screen and attaches the event handlers. It doesn't rebuild the page.

<StepFlow title="What hydrateRoot does" :steps="hydrationSteps" />

### The rule: client and server must match

The client's first render must produce exactly the server's HTML. If it doesn't, React logs a hydration mismatch. Common causes:

| Cause | Fix |
| --- | --- |
| `Date.now()`, `Math.random()` or `new Date().toLocaleString()` in render | Pass the value from the server, or render it after mount |
| `typeof window !== 'undefined'` branches in render | Render the same output first, then update in `useEffect` |
| Browser extensions or invalid nesting such as `<div>` inside `<p>` | Fix the HTML; `suppressHydrationWarning` only for unavoidable single nodes |
| Random IDs for `aria-*` and `htmlFor` | Use `useId()`, which is stable between server and client |

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| `hydrateRoot` | Attach React to existing server HTML |
| `<Suspense>` (selective hydration) | Hydrate sections independently, and the clicked section first |
| `useId` | Matching IDs on server and client |
| `useSyncExternalStore` with `getServerSnapshot` | Read browser-only stores without a mismatch |
| Server components (concept 14) | Less code to hydrate |

**In an interview:** "Hydration is the price of SSR: the client repeats the render to attach handlers. I reduce it with Suspense for selective hydration and server components for code that never needs to be interactive."

## 13. Partial prerendering

Partial prerendering (PPR) serves most of a page as a ready-made static file and fills in the personal parts on each request.

### The problem: fast or fresh, pick one

- A static page is built once at build time. It is instant from a CDN, but the same for everyone.
- An SSR page is personal, with your cart and your price, but the server builds it on every request, which is slower.
- Most pages are mostly the same for everyone, with a few personal parts.

### The fix: a static shell with holes

- **Static shell:** The shared parts, such as layout, navigation and product description, are built once and served instantly from the CDN.
- **Dynamic holes:** The personal parts, such as cart, your price and recommendations, are wrapped in `<Suspense>`. The server renders them per request and streams them into the same response.

### The catch

- It is more complex than either approach on its own. In practice a framework handles it.

Select **Partial prerendering** in the timeline above to compare it with the other strategies.

### Example

```tsx
// The page is static, except what is inside Suspense, which streams in per request
export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <>
      <ProductDetails id={params.id} />          {/* prerendered at build time */}
      <Suspense fallback={<PriceSkeleton />}>
        <PersonalisedPrice id={params.id} />      {/* reads cookies: dynamic */}
      </Suspense>
      <Suspense fallback={<CartSkeleton />}>
        <MiniCart />                              {/* dynamic */}
      </Suspense>
    </>
  )
}
```

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| Next.js Partial Prerendering | The main production implementation; check your version's docs for the config flag |
| `prerender` and `resume` in `react-dom` (React 19.2) | The low-level APIs: prerender a shell, then resume the postponed parts per request |
| `<Suspense>` | Marks where the static shell ends and the dynamic holes begin |
| Astro server islands | The same idea outside React |

**In an interview:** "PPR serves a static shell from the CDN and streams per-user holes. It is worth it for high-traffic pages like e-commerce, where most of the page is shared."

## 14. Server components

React Server Components (RSC) run only on the server and send the browser the result, not the code.

### The problem: shipping code the browser never needs

- A product description that only displays text still ships its JavaScript, including any library it uses, such as a 60 KB Markdown parser.
- The browser downloads that code and hydrates it, even though it never reacts to anything.

### The fix: split the tree by interactivity

- **Server components, the default:** Display-only components run on the server. They ship zero JavaScript and need no hydration.
- **Client components, marked `'use client'`:** Only components with state, effects or click handlers are bundled and hydrated.

### How it differs from SSR

- SSR makes the first paint fast, but still ships and hydrates all the code.
- Server components remove code, so there is less to download and less to hydrate.

<ServerComponentsTree />

### Example

```tsx
// ProductPage.tsx: a server component (the default). Async, reads data directly.
import { marked } from 'marked'            // stays on the server
import { AddToCart } from './AddToCart'

export default async function ProductPage({ id }: { id: string }) {
  const product = await db.product.find(id)
  return (
    <article>
      <div dangerouslySetInnerHTML={{ __html: marked(product.description) }} />
      <AddToCart sku={product.sku} />       {/* props must be serialisable */}
    </article>
  )
}
```

```tsx
// AddToCart.tsx: a client component. Everything it imports is bundled for the browser.
'use client'
import { useState } from 'react'

export function AddToCart({ sku }: { sku: string }) {
  const [added, setAdded] = useState(false)
  return <button onClick={() => setAdded(true)}>{added ? 'Added' : 'Add to cart'}</button>
}
```

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| Next.js App Router, React Router with RSC, Waku | Frameworks that support server components |
| `'use client'` | Marks the boundary; push it down to the smallest interactive leaf |
| `'use server'` (server functions) | Call server code from a client form or button |
| `server-only` package | Build error if server code (secrets, database) is imported into a client component |
| TypeScript | Async components are typed; props crossing the boundary must be serialisable (no functions, classes or Dates) |

**In an interview:** "Server components split the tree by what needs interactivity. Non-interactive parts ship no JS and need no hydration. The key mistake to avoid is putting `'use client'` high in the tree."

## 15. Micro frontends

Micro frontends split one big frontend into smaller apps, each owned and shipped by a separate team.

### The problem: too many people in one codebase

- With ten teams in one app, every release waits for everyone, and one team's bug blocks the rest.
- Teams change the same files and get in each other's way.

### The fix: independent apps inside one shell

- **Separate apps:** Each team builds, tests and deploys its part on its own. It might use its own framework and its own backend for frontend (BFF), a small server made for that one app.
- **A shell (host) app:** It loads the apps at runtime and owns what everyone shares: routing, login, language, theme and design tokens.
- **A small contract:** Apps don't reach into each other. They talk through a few typed, versioned events.

### The catch

- It scales teams, not speed. Loading several apps usually makes the page a little slower.
- Share big libraries such as React as one copy, a singleton, so users don't download them twice.

<MicroFrontendsDemo />

### Example

```ts
// @shop/events: a tiny shared package that is the only contract between apps
export type ShopEvents = {
  'cart:item-added': { sku: string; qty: number }
  'shell:locale': { locale: string }
  'shell:logout': Record<string, never>
}

export function publish<K extends keyof ShopEvents>(type: K, detail: ShopEvents[K]) {
  window.dispatchEvent(new CustomEvent(type, { detail }))
}

export function subscribe<K extends keyof ShopEvents>(type: K, handler: (detail: ShopEvents[K]) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<ShopEvents[K]>).detail)
  window.addEventListener(type, listener)
  return () => window.removeEventListener(type, listener)   // call it in useEffect cleanup
}
```

### React and TypeScript tools

| Tool | What it does for this concept |
| --- | --- |
| Module Federation (webpack 5, Rspack, `@module-federation/vite`) | Load another team's components at runtime and share React as a singleton |
| single-spa | Mounts and unmounts apps, even ones in different frameworks |
| Web Components (Custom Elements) | A framework-neutral boundary between apps |
| `CustomEvent`, `BroadcastChannel` | Events within a page or across tabs |
| A shared TypeScript package for events and props | Typed contract that each team versions independently |
| Nx or Turborepo | Monorepo tooling when teams share a repository |

**In an interview:** "Micro frontends solve an organisation problem: too many people in one codebase. I would only choose them with several teams and independent release needs, and I would keep the contract between apps to typed events and a shared design system."

## How the 15 connect

- The **critical rendering path** (1) defines what **LCP and CLS** (2) measure.
- **Caching** (3), **compression** (4), **lazy loading** (5), **bundle splitting** (6) and **critical CSS** (7) all shorten that path.
- **Essential state** (8) and **reducers** (9) keep updates small and predictable, and **windowing** (10) keeps the DOM small. Together they protect **INP**.
- **SSR** (11), **hydration** (12), **PPR** (13) and **server components** (14) decide where rendering happens, to get content and interactivity sooner.
- **Micro frontends** (15) scale the people building all of the above.

When a new library arrives, ask which of these it implements. That is usually most of what you need to know.
