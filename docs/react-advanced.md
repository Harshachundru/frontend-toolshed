# 5. React advanced: routing, errors, Suspense, server rendering and testing

Senior interviews move past hooks into how a React app is structured, rendered and kept reliable. For each tool, know the problem it solves and when you would reach for it.

## 5.1 Routing

A router decides which component to show for the URL in the address bar. React Router does this in code. Next.js and Remix do it from the file names in your project.

### The ideas to know

- **Nested routes and layouts:** A `/settings` layout wraps `/settings/profile` and `/settings/billing`, so the shared sidebar renders once.
- **Dynamic segments:** `/users/:id` matches `/users/42` and gives you `id = 42`.
- **Search params:** Filters, tabs and page numbers in `?status=open&page=2`, so a link or refresh keeps them.
- **Lazy routes:** Each route's code downloads only when the user visits it.
- **Loaders:** Fetch a route's data before it renders, instead of in an effect afterwards.
- **Protected routes:** Send logged-out users to the login page.

```jsx
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}
```

### The catch

A route guard in the browser only improves the user experience. Anyone can edit the JavaScript, so the server must check permissions on every API call.

## 5.2 Error boundaries

An error boundary is a safety net around part of the page. If something inside it crashes while rendering, it shows a fallback instead of a blank screen.

### The problem

- One component throws during render, and React removes the whole tree. The user sees a white page.

### The fix

```jsx
<ErrorBoundary fallback={<p>Something went wrong.</p>} onError={reportToSentry}>
  <Dashboard />
</ErrorBoundary>
```

- Wrap each independent widget, so one failure doesn't take down the page.
- It must be a class component, or use the `react-error-boundary` package.

### What it doesn't catch

- Errors in event handlers, async code and server rendering. Catch those with `try/catch` and report them yourself.

## 5.3 Portals and refs

- **Portal:** `createPortal(child, document.body)` draws a component somewhere else in the page, outside its parent element. Use it for modals, tooltips and toasts, so a parent's `overflow: hidden` or stacking order can't clip them. Events still bubble up through the React tree as normal.
- **Passing a ref:** `forwardRef` passes a ref to a child's DOM element. In React 19, `ref` is a normal prop and you don't need `forwardRef`.
- **`useImperativeHandle`:** Exposes a small, chosen API from a child, such as `focus()`, instead of the whole DOM element.

## 5.4 Code splitting, Suspense and concurrent features

Suspense is a placeholder: while part of the tree is waiting for code or data, React shows a fallback instead.

```jsx
const Settings = lazy(() => import('./Settings'));
<Suspense fallback={<Spinner />}>
  <Settings />
</Suspense>
```

### Keeping the page responsive

- **Concurrent rendering (React 18+):** React can pause a slow, low-priority render to handle a click or keystroke first.
- **`useTransition`:** Marks a state update as non-urgent, such as filtering a big list, so typing in the box stays smooth.
- **`useDeferredValue`:** Renders with a copy of a value that lags slightly behind, so the urgent part updates first.
- **Automatic batching:** Several state updates in a timeout or promise become one render, not several.

## 5.5 Rendering strategies and Next.js

The question is where and when the HTML is made: in the browser, on the server per request, or once at build time.

| Strategy | How | Good for | Trade-off |
| --- | --- | --- | --- |
| CSR (client-side rendering) | Empty HTML, JavaScript builds the page | Dashboards behind a login | Slow first paint, weak SEO |
| SSR (server-side rendering) | HTML built for each request | Personalised, SEO-critical pages | Server cost, slower first byte |
| SSG (static generation) | HTML built at build time | Blogs, docs, marketing | Stale until the next build |
| ISR (incremental static regeneration) | Static, rebuilt in the background | Product catalogues | Briefly stale |
| RSC (React Server Components) | Components run only on the server and send no JS | Data-heavy pages | New mental model, server and client boundary |

### Hydration

- **What it is:** After SSR, React attaches click handlers to the HTML the server sent.
- **Hydration mismatch:** The server and the browser rendered different output. Usual causes are dates, `Math.random()` and `window` checks during render.

### Server and client components (Next.js App Router)

- **Server components, the default:** Can be `async`, read the database directly, and ship no JavaScript.
- **Client components:** Add `'use client'` when a component needs state, effects, click handlers or browser APIs.
- **Server Actions:** Functions marked `'use server'` that a form calls, and that run on the server.

## 5.6 Testing

Test the app the way a user uses it: click buttons and read the screen, not the component's internals.

### The testing trophy

Mostly integration tests, some unit tests and a few end-to-end tests, all on top of static checks such as TypeScript and ESLint.

| Layer | Tools | What to test |
| --- | --- | --- |
| Static | TypeScript, ESLint | Types, hook rules, accessibility lint |
| Unit | Vitest or Jest | Pure functions, reducers, hooks |
| Component and integration | React Testing Library, MSW for API mocks | User flows inside a screen |
| End-to-end | Playwright, Cypress | Critical journeys: login, checkout |
| Visual | Storybook and Chromatic | Unintended UI changes |

### React Testing Library habits

- Find elements by role and label, as a screen reader would: `getByRole('button', { name: /save/i })`.
- Type and click with `userEvent`.
- Wait for content that loads later with `findBy`.

```jsx
test('shows an error when login fails', async () => {
  server.use(http.post('/api/login', () => HttpResponse.json({}, { status: 401 })));
  render(<Login />);
  await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i);
});
```

## 5.7 Project structure

Once an app grows, group files by feature, not by file type.

- **By feature:** `features/cart/{components, hooks, api, cartSlice.ts, cart.test.tsx}`. Everything about the cart lives in one folder.
- **Shared pieces:** A `ui/` design system, a typed API client, and absolute imports.
- **Large organisations:** Monorepos (Nx, Turborepo) and micro frontends (Module Federation) let teams ship on their own, at the cost of complexity.

## 5.8 Interview questions with model answers

1. **What is an error boundary and what does it not catch?** A component that catches render errors in its children and shows a fallback. It doesn't catch errors in event handlers, async code or server rendering.
2. **What are portals used for?** Modals and overlays that must escape a parent's `overflow: hidden` or stacking order.
3. **CSR vs SSR vs SSG?** CSR builds the page in the browser. SSR builds HTML on the server for every request. SSG builds HTML once at build time.
4. **What is hydration? What causes a mismatch?** Attaching click handlers to server-rendered HTML. A mismatch is the server and browser rendering different output, usually from dates, random numbers or `window` checks.
5. **What are React Server Components?** Components that render only on the server and send no JavaScript. They can't use state or effects.
6. **What does Suspense do?** Shows a fallback while children wait for code or data.
7. **What is `useTransition`?** It marks an update as non-urgent, so urgent ones such as typing stay responsive.
8. **How do you test a component that fetches data?** React Testing Library with MSW to fake the network, then assert on what the user sees.
9. **Why test behaviour, not implementation?** The tests survive refactors and catch bugs that users would hit.
10. **How do you protect a route?** A wrapper or loader that redirects. The server still enforces access.
11. **What is new in React 19?** Actions, `useActionState`, `useOptimistic`, `use`, `ref` as a normal prop, the React Compiler for automatic memoisation, and document metadata in components.
12. **How would you structure a large React app?** Feature folders, a shared UI library, a typed API layer, and clear rules for where state lives.

## 5.9 STAR example: a blank screen in production

- **Situation:** A third-party chart widget threw on malformed data. We had no error boundaries, so the whole analytics page went blank for some customers.
- **Task:** I was asked to make the page resilient and improve how we learned about errors.
- **Action:** I added error boundaries around each widget, with a retry button and a friendly message, and sent `onError` to Sentry with the widget name and user id as tags. I added Zod schema validation at the API boundary, so malformed data was caught and logged before it reached the chart. I wrote a test that rendered the page with one broken widget and asserted the others still showed.
- **Result:** Later data issues affected one card instead of the page. Sentry alerts let us fix two upstream data bugs before customers reported them, and error boundaries became part of our page template.
