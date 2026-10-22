# 5. React advanced: routing, errors, Suspense, server rendering and testing

Senior interviews move past hooks into how a React app is structured, rendered, and kept reliable. Know what each tool solves and when you would reach for it.

## 5.1 Routing

React Router (or the file-based routers in Next.js and Remix) maps URLs to components. Key ideas: nested routes and layouts, dynamic segments (`/users/:id`), search params for filter state, route-level code splitting with `lazy`, loaders that fetch data before render, and protected routes that redirect unauthenticated users.

```jsx
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}
```

Remember: frontend route guards are for user experience only. The server must enforce authorisation on every API call.

## 5.2 Error boundaries

An error boundary catches errors thrown while rendering its children and shows a fallback instead of a blank page. It must be a class component (or use the `react-error-boundary` package). It does **not** catch errors in event handlers, async code or server rendering; handle those with `try/catch` and report them.

```jsx
<ErrorBoundary fallback={<p>Something went wrong.</p>} onError={reportToSentry}>
  <Dashboard />
</ErrorBoundary>
```

Place boundaries around independent widgets so one failure does not take down the page.

## 5.3 Portals and refs

- `createPortal(child, document.body)` renders outside the parent DOM node: modals, tooltips, toasts. Events still bubble through the React tree.
- `forwardRef` passes a ref to a child DOM node (in React 19, `ref` is a normal prop). `useImperativeHandle` exposes a limited API such as `focus()`.

## 5.4 Code splitting, Suspense and concurrent features

```jsx
const Settings = lazy(() => import('./Settings'));
<Suspense fallback={<Spinner />}>
  <Settings />
</Suspense>
```

- **Suspense** shows a fallback while a child is waiting (lazy code, or data from a Suspense-enabled library).
- **Concurrent rendering** (React 18+) lets React interrupt low-priority rendering to handle urgent input.
- **`useTransition`**: mark a state update as non-urgent (filtering a big list) so typing stays responsive.
- **`useDeferredValue`**: render with a lagging copy of a value.
- **Automatic batching**: multiple state updates in timeouts and promises are batched into one render.

## 5.5 Rendering strategies and Next.js

| Strategy | How | Good for | Trade-off |
| --- | --- | --- | --- |
| CSR (client-side rendering) | Empty HTML, JS builds the page | Dashboards behind login | Slow first paint, weak SEO |
| SSR (server-side rendering) | HTML built per request | Personalised, SEO-critical pages | Server cost, slower TTFB |
| SSG (static generation) | HTML built at build time | Blogs, docs, marketing | Stale until rebuild |
| ISR (incremental static) | Static, regenerated in background | Product catalogues | Brief staleness |
| RSC (React Server Components) | Components run only on the server, send no JS | Data-heavy pages | New mental model, server/client boundary |

**Hydration** attaches event handlers to server-rendered HTML. A hydration mismatch happens when server and client render different output (dates, `Math.random`, `window` checks during render).

**Server Components vs Client Components** (Next.js App Router): components are server by default, can be `async` and read the database directly, and ship no JS. Add `'use client'` for state, effects, event handlers or browser APIs. **Server Actions** (`'use server'`) are functions called from forms that run on the server.

## 5.6 Testing

The testing trophy: mostly integration tests, some unit tests, a few end-to-end tests, all on top of static checks (TypeScript, ESLint).

| Layer | Tools | What to test |
| --- | --- | --- |
| Static | TypeScript, ESLint | Types, hook rules, a11y lint |
| Unit | Vitest or Jest | Pure functions, reducers, hooks |
| Component / integration | React Testing Library, MSW for API mocks | User flows inside a screen |
| End-to-end | Playwright, Cypress | Critical journeys: login, checkout |
| Visual | Storybook + Chromatic | Unintended UI changes |

React Testing Library philosophy: test what the user sees and does, not implementation details. Query by role and label (`getByRole('button', { name: /save/i })`), use `userEvent`, and `findBy` for async content.

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

Organise by feature, not by file type, once an app grows: `features/cart/{components, hooks, api, cartSlice.ts, cart.test.tsx}`. Keep a shared `ui/` design system, a typed API client, and absolute imports. In large organisations, monorepos (Nx, Turborepo) and micro-frontends (Module Federation) let teams ship independently, at the cost of complexity.

## 5.8 Interview questions with model answers

1. **What is an error boundary and what does it not catch?** See 5.2.
2. **What are portals used for?** Modals and overlays that must escape `overflow: hidden` or z-index stacking.
3. **CSR vs SSR vs SSG?** See the table in 5.5.
4. **What is hydration? What causes a mismatch?** See 5.5.
5. **What are React Server Components?** Components that render on the server only and send no JS; they cannot use state or effects.
6. **What does Suspense do?** Shows a fallback while children wait for code or data.
7. **What is `useTransition`?** Marks updates as interruptible to keep urgent ones responsive.
8. **How do you test a component that fetches data?** RTL plus MSW to mock the network, assert on what the user sees.
9. **Why test behaviour, not implementation?** Tests survive refactors and catch real user-facing bugs.
10. **How do you protect a route?** Wrapper or loader that redirects; the server still enforces access.
11. **What is new in React 19?** Actions, `useActionState`, `useOptimistic`, `use`, `ref` as a prop, the React Compiler for automatic memoisation, document metadata support.
12. **How would you structure a large React app?** Feature folders, shared UI library, typed API layer, clear state boundaries.

## 5.9 STAR example: a blank screen in production

- **Situation**: A third-party chart widget threw on malformed data, and because we had no error boundaries, the whole analytics page went blank for some customers.
- **Task**: I was asked to make the page resilient and improve how we learned about errors.
- **Action**: I added error boundaries around each widget with a retry button and a friendly message, and connected `onError` to Sentry with the widget name and user id as tags. I added schema validation with Zod at the API boundary so malformed data was caught and logged before it reached the chart. I wrote a test that rendered the page with one broken widget and asserted the others still showed.
- **Result**: Later data issues affected one card instead of the page. Sentry alerts let us fix two upstream data bugs before customers reported them, and error boundaries became part of our page template.
