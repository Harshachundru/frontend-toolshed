# 9. Performance optimisation

Performance work means making a page load faster and react faster to the user.

The answer interviewers want is a process, not a list of tricks:

1. **Measure:** Get real numbers before you change anything.
2. **Find the bottleneck:** The one thing that costs the most.
3. **Fix the biggest one.**
4. **Measure again:** Prove it helped.

Optimising without measuring is the most common mistake candidates describe.

## 9.1 Core Web Vitals

Core Web Vitals are three scores Google uses to judge how a page feels to real users. The [core concepts page](/core-concepts#_2-core-web-vitals) explains each one in detail.

| Metric | Measures | Good | Common causes when poor |
| --- | --- | --- | --- |
| LCP (Largest Contentful Paint) | Loading: when the main content appears | 2.5 s or less | Slow server, render-blocking CSS/JS, large unoptimised hero image, client-only rendering |
| INP (Interaction to Next Paint) | Responsiveness to clicks, taps, keys | 200 ms or less | Long JS tasks, heavy re-renders, large DOM |
| CLS (Cumulative Layout Shift) | Visual stability | 0.1 or less | Images without size, late ads or banners, web fonts swapping |

INP replaced FID in March 2024.

### Other metrics worth naming

- **TTFB (Time to First Byte):** How long the server takes to start replying.
- **FCP (First Contentful Paint):** When anything at all first appears.
- **TBT (Total Blocking Time):** How long the main thread was blocked during load. A lab stand-in for INP.

### Lab data vs field data

- **Lab data:** Lighthouse and WebPageTest load the page on one controlled machine. Good for debugging, but it isn't your users.
- **Field data:** Real-user monitoring (RUM) collects scores from real devices and networks, through the `web-vitals` library, the Chrome UX Report, Sentry or Datadog.
- **The rule:** Make decisions from field data.

## 9.2 Loading performance

Loading performance is how fast the first view appears. The problem is almost always too many bytes, or bytes that arrive in the wrong order.

- **Code splitting**: split by route with `React.lazy` and dynamic `import()`; load heavy widgets (charts, editors, maps) on demand.
- **Bundle size**: analyse with `vite-bundle-visualizer` or `webpack-bundle-analyzer`. Replace heavy libraries (moment with date-fns or `Intl`), import only what you use, and rely on tree shaking with ES modules.
- **Images**: modern formats (AVIF, WebP), responsive `srcset`, `loading="lazy"` below the fold, `fetchpriority="high"` on the LCP image, explicit `width`/`height`, a CDN with on-the-fly resizing (or `next/image`).
- **Fonts**: self-host, subset, `font-display: swap`, preload the main font, use `size-adjust` to reduce shift.
- **Network**: CDN, HTTP/2 or 3, Brotli compression, long cache headers on hashed assets, `preconnect` to API and font origins, fewer round trips.
- **Rendering strategy**: SSR, SSG or streaming SSR for content pages so HTML arrives ready to paint.
- **Third-party scripts**: audit them; load with `defer` or after interaction; they are often the biggest cost.

## 9.3 Runtime performance

Runtime performance is how smoothly the page responds after it has loaded.

### The problem: the main thread is busy

- The browser runs your JavaScript, handles clicks and paints frames on one main thread.
- A task longer than 50 ms (a long task) blocks everything else, so clicks feel laggy.

### The fixes

- Break up **long tasks** (over 50 ms) with `scheduler.yield()`, `setTimeout` chunks, or move work to a **Web Worker**.
- **Debounce** search input and **throttle** scroll and resize handlers.
- Avoid **layout thrashing**: batch DOM reads, then writes; use `requestAnimationFrame` for visual updates.
- Use `IntersectionObserver` instead of scroll listeners for lazy loading and infinite scroll.
- Animate only `transform` and `opacity`.
- Clean up timers, subscriptions and listeners to avoid memory leaks.

## 9.4 React performance

### The problem: renders that don't need to happen

- When state changes, React re-renders that component and all its children.
- Usually that is cheap. It becomes slow when the tree is large, or a child does heavy work.

### Find it before you fix it

Use the **React DevTools Profiler** ("Highlight updates" and flame graphs) and Chrome's Performance panel to find the slow component.

### The fixes

| Technique | Use when | Watch out |
| --- | --- | --- |
| `React.memo` | A component re-renders often with the same props and is costly | Useless if props are new objects or functions each render |
| `useCallback` | Passing a callback to a memoised child or a hook dependency | Adds overhead if the child is not memoised |
| `useMemo` | Expensive calculation, or keeping an object reference stable | Do not wrap cheap work |
| Move state down | Only a small part of the tree needs the state | Usually the best fix, with zero cost |
| Lift content up (pass `children`) | A wrapper with state re-renders static children | Children passed as props are not re-rendered |
| Split context / use selectors | Many consumers re-render on unrelated changes |  |
| List virtualisation (TanStack Virtual, react-window) | Lists of hundreds or thousands of rows | Accessibility and scroll restoration need care |
| `useTransition` / `useDeferredValue` | Typing lags while a big list filters |  |
| Stable keys | Lists reorder | Index keys cause extra work and bugs |
| React Compiler | React 19 projects | Automates most manual memoisation |

```jsx
const Row = React.memo(function Row({ item, onSelect }) {
  return <li onClick={() => onSelect(item.id)}>{item.name}</li>;
});

function List({ items }) {
  const [selected, setSelected] = useState(null);
  const handleSelect = useCallback(id => setSelected(id), []);
  return <ul>{items.map(i => <Row key={i.id} item={i} onSelect={handleSelect} />)}</ul>;
}
```

## 9.5 Perceived performance

Perceived performance is how fast the app feels, which can improve even when the real timings don't.

- **Skeleton screens:** Grey outlines of the coming content, instead of a spinner.
- **Optimistic updates:** Show the result of a click straight away, and roll back if the server says no.
- **Prefetching:** Fetch data when the user hovers a link, or when the link scrolls into view.
- **Keep the old data:** Leave the previous page visible while the next one loads.
- **Instant feedback:** Every click changes something on screen at once.

## 9.6 Performance budgets and monitoring

### The problem: speed slowly leaks away

Each release adds a little JavaScript. Nobody notices one change, but a year later the page is twice as slow.

### The fix: a budget the build enforces

- **Set budgets:** For example, initial JavaScript under 200 KB compressed, and LCP under 2.5 s at the 75th percentile.
- **Enforce them in CI:** Lighthouse CI or `size-limit` fails the build when a budget is broken.
- **Watch real users:** Track Web Vitals on a dashboard, alert on regressions, and review it after each release.

## 9.7 Interview questions with model answers

1. **How would you improve a slow React app?** Measure with Profiler and Lighthouse; then target the bottleneck: bundle size, network waterfalls, unnecessary re-renders, large lists.
2. **What are Core Web Vitals?** Three scores for real-user experience: LCP for loading, INP for responsiveness, and CLS for visual stability.
3. **When should you use `React.memo`, `useMemo`, `useCallback`?** Only after profiling shows costly re-renders, and together (memo is useless with unstable props).
4. **What is code splitting?** Splitting the bundle so users download only what the current route needs.
5. **What is tree shaking?** Removing unused exports at build time; needs ES modules and side-effect-free code.
6. **How do you render 10,000 rows?** Virtualisation: render only visible rows, plus pagination or infinite loading from the server.
7. **How do you reduce CLS?** Reserve space for images, ads and embeds; avoid inserting content above existing content; handle font swaps.
8. **How do you improve LCP?** Faster server and CDN, SSR, preload and prioritise the hero image, remove render-blocking resources.
9. **How do you improve INP?** Shorter tasks, less JS, fewer re-renders, `useTransition`, web workers.
10. **What is lazy loading?** Deferring loading of code, images or data until needed.
11. **What is a memory leak in React and how do you find one?** Missing effect cleanups, global listeners. Use the DevTools Memory panel and heap snapshots.
12. **How would you prevent performance regressions?** Budgets in CI, RUM dashboards, alerts, performance as part of code review.

## 9.8 STAR example: a slow product listing page

- **Situation**: Our e-commerce listing page had an LCP of 4.8 seconds on mobile at the 75th percentile, and the business linked it to a high bounce rate.
- **Task**: I was asked to bring LCP under 2.5 seconds within one quarter, without a redesign.
- **Action**: I measured first, using field data and Lighthouse traces. Three problems stood out: a 1.2 MB JavaScript bundle, a hero image without priority hints, and data fetched only after JavaScript loaded. I split the bundle by route and lazy-loaded the filters panel and a chart library, which cut initial JS by about 55%. I served the hero image as AVIF through the CDN with `fetchpriority="high"` and fixed dimensions. I moved the first page of products to server rendering. I then virtualised the product grid and memoised the product card, which made filtering responsive. I added Lighthouse CI with a budget so the gains could not quietly regress.
- **Result**: LCP at the 75th percentile fell to 2.1 seconds and CLS to 0.03. Bounce rate on mobile dropped by about 12% over the next month. I presented the approach at our engineering forum and it became the checklist for other pages.
