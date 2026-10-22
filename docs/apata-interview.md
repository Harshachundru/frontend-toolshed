# 14. Apata role: interview questions

Questions an interviewer is likely to ask for the Apata Frontend / Senior Frontend Developer role, mapped to the job description. Each answer starts with the one line to say first, then the points to back it up, then links to the sections that go deeper. Answers that draw on my own work point to the [resume STAR stories](/resume-star) (page 12). New topics point to [page 13](/fintech-fullstack-ts).

## 14.1 The role in one table

| Job description says | What they'll test | Where to prepare |
| --- | --- | --- |
| Merchant SPA: React, Vite, TypeScript | React depth, TypeScript, SPA architecture | 14.2, [3](/react-core), [2](/typescript) |
| Next.js app with tRPC and TanStack Query | Server/client split, caching, typed APIs | 14.3, 14.4, [13.1–13.4](/fintech-fullstack-ts) |
| pnpm / Turborepo monorepo | Workspaces, task caching, shared packages | 14.5, [13.5](/fintech-fullstack-ts#_13-5-pnpm-workspaces-and-turborepo) |
| API and BFF contract design | Pagination, errors, auth at the boundary | 14.4, [13.3](/fintech-fullstack-ts#_13-3-bff-in-next-js), [12.10](/resume-star#_12-10-api-contract-disagreement) |
| Fraud prevention and card authentication | 3DS, iframes, security, money | 14.6, [13.8–13.10](/fintech-fullstack-ts#_13-8-3-d-secure) |
| Wireframes to high-performance components | Design process, performance, CSS | 14.7, [13.11](/fintech-fullstack-ts#_13-11-from-design-to-components), [9](/performance) |
| Unit, component and E2E testing | Strategy, tools, testing server state | 14.8, [13.7](/fintech-fullstack-ts#_13-7-testing-trpc-and-tanstack-query) |
| Code review and architecture | Judgement, influence, seniority | 14.9 |

::: tip Your gaps for this role
tRPC, Turborepo and pnpm, and 3DS. Study [page 13](/fintech-fullstack-ts) first, and be honest in the interview: "I haven't used tRPC in production, but here's how it compares with GraphQL CodeGen, which I have."
:::

## 14.2 React and TypeScript depth

**1. How does React decide when to re-render? How do you find and fix unnecessary re-renders?**

A component re-renders when its state changes, its parent re-renders, or a context it reads changes.

- **Find it:** The React Profiler shows why each component rendered.
- **Fix the cheapest way first:** Move state down to where it's used. Pass children instead of rendering them inside a stateful parent. Split contexts.
- **Only then memoise:** `memo`, `useMemo` and `useCallback`.
- **My example:** On our AG Grid screens, unstable column definitions made the whole grid redraw, so I memoised them.

See [9.4](/performance#_9-4-react-performance), [12.9](/resume-star#_12-9-performance-on-data-heavy-screens).

**2. Explain `useEffect` cleanup and a bug it causes if you get it wrong.**

Cleanup runs before the effect runs again, and when the component unmounts.

- **Bug 1, leaks:** Intervals and listeners keep running after the component is gone.
- **Bug 2, race conditions:** Type "ab" quickly into a search box. The slow response for "a" can arrive after "ab" and overwrite it.
- **The fix:** An `AbortController` aborted in cleanup, or a query library that handles it.
- **How React helps:** Strict Mode runs effects twice in development, to expose missing cleanup.

See [3.5](/react-core#_3-5-useeffect-done-right).

**3. Type a generic `DataTable<T>` whose columns are keyed to `T`.**

```tsx
type Column<T> = { [K in keyof T]: { key: K; header: string; render?: (value: T[K], row: T) => React.ReactNode } }[keyof T];

function DataTable<T extends { id: string }>({ rows, columns }: { rows: T[]; columns: Column<T>[] }) {
  return (
    <table>
      <thead><tr>{columns.map((c) => <th key={String(c.key)}>{c.header}</th>)}</tr></thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((c) => <td key={String(c.key)}>{c.render ? c.render(row[c.key], row) : String(row[c.key])}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- **The key idea:** The mapped type ties each column's `render` to the type of its own key, so `render` for `amount` receives a number.
- **My example:** I built typed AG Grid column definitions the same way.

See [2.4](/typescript#_2-4-generics).

**4. How would you type a payment status or an API result?**

With a discriminated union: each state carries only its own data, and the compiler forces you to handle every state.

```ts
type Auth =
  | { status: 'frictionless' }
  | { status: 'challenge'; method: 'otp' | 'app' }
  | { status: 'failed'; reason: string };

function label(a: Auth) {
  switch (a.status) {
    case 'frictionless': return 'Approved';
    case 'challenge': return `Challenge (${a.method})`;
    case 'failed': return `Failed: ${a.reason}`;
    default: { const never: never = a; return never; }
  }
}
```

Add a new status, and every `switch` that doesn't handle it fails to compile. See [2.3](/typescript#_2-3-narrowing-and-discriminated-unions).

**5. `unknown` vs `any`? When do you use `satisfies`? How do you validate API data?**

- **`any`:** Turns type checking off.
- **`unknown`:** Forces you to check the type before use. Use it for anything from outside the app.
- **`satisfies`:** Checks a value against a type without widening it, so you keep the exact literal types. Useful for config and route maps.
- **Validating API data:** Types vanish at runtime, so I validate at the boundary with Zod and infer the type from the schema.

See [2.2](/typescript#_2-2-core-concepts).

**6. What changed in React 18 and 19 that matters to you?**

- **React 18:** Concurrent rendering, automatic batching, `useTransition` and `useDeferredValue` to keep typing responsive during heavy renders, and Suspense for data.
- **React 19:** Actions with `useActionState` and `useOptimistic` for forms, `use` for reading promises and context, `ref` as a prop, and Server Components as a stable part of React.

See [5.4](/react-advanced#_5-4-code-splitting-suspense-and-concurrent-features).

## 14.3 SPA and Next.js

**7. You have a Vite SPA and a Next.js app. When would you build a feature in each?**

Choose by whether the page needs first-load speed, SEO or server-side secrets.

- **SPA:** The merchant dashboard is behind a login, highly interactive, and doesn't need SEO. A client-rendered SPA is simple and fast after the first load.
- **Next.js:** Pages where first-load speed or SEO matters, pages that need server-side secrets, and anything that benefits from a BFF next to the UI.
- **My experience:** Client-side React apps at ICHEC, and a Next.js prototype of the ICHEC portal.

See [12.3](/resume-star#_12-3-server-and-client-components), [5.5](/react-advanced#_5-5-rendering-strategies-and-next-js).

**8. Explain hydration and a hydration mismatch.**

Hydration attaches React's event handlers to the HTML the server sent.

- **The rule:** The first client render must match the server's HTML exactly.
- **What breaks it:** Dates and time zones, `Math.random`, `typeof window` checks during render, and locale-dependent formatting such as currency.
- **The fix:** Render the same thing on both sides, pin the locale and time zone, or move browser-only values into an effect.

**9. Where would you put a transactions table with filters in the App Router?**

- **Server Component page:** Reads the filters from `searchParams` and fetches the first page on the server.
- **Client Components:** The filter bar and the table's interactive parts.
- **Filters in the URL:** So a view can be shared and survives a reload.
- **Live data:** Hand off to TanStack Query on the client, with the server data as its initial data.

**10. How do caching and revalidation work in Next.js?**

Since Next.js 15, `fetch` isn't cached unless you ask.

- **Opt in:** `next: { revalidate, tags }` on the request.
- **Clear after a change:** `revalidateTag` or `revalidatePath` after a mutation.
- **Keep uncached:** Per-user or real-time data, such as fraud alerts.

See [13.4](/fintech-fullstack-ts#_13-4-next-js-caching-and-revalidation).

## 14.4 tRPC, TanStack Query and BFF

**11. Have you used tRPC? How does it compare with what you've done?**

"Not in production. I've used GraphQL with CodeGen for typed contracts."

- **What tRPC adds:** The same type safety without a schema or codegen step. The client imports the router's type, so a server change that breaks the client fails to compile.
- **The trade-off:** Both sides must be TypeScript, which fits a monorepo with a BFF.

See [13.1](/fintech-fullstack-ts#_13-1-trpc).

**12. What does TanStack Query give you over `useEffect` and Redux?**

It manages server data for you, so you stop writing loading and error flags by hand.

- **Cache:** Keyed by query, with request deduplication.
- **Freshness:** Background refetching and stale-while-revalidate.
- **Reliability:** Retries.
- **Built in:** Pagination, infinite queries and mutations.
- **What I'd change on my last project:** Move server data into a query library, and keep Redux only for client state.

See [4.6](/react-state#_4-6-server-state-with-tanstack-query), [12.2](/resume-star#_12-2-redux-vs-context).

**13. Design an optimistic update for marking a transaction as reviewed.**

Snapshot, apply, roll back on error, invalidate when settled.

- **`onMutate`:** Cancel in-flight queries, snapshot the cache, apply the change.
- **`onError`:** Restore the snapshot and show an error.
- **`onSettled`:** Invalidate, so the server's version wins.
- **When not to:** Anything that moves money, or that someone relies on as final. That waits for the server.

See [13.2](/fintech-fullstack-ts#_13-2-trpc-with-tanstack-query).

**14. What is a BFF and why put one in front of our services?**

A thin server layer built for one UI.

- **Shapes data:** Combines service calls into the shape a screen needs.
- **Protects tokens:** Keeps tokens and secrets on the server, behind an httpOnly cookie.
- **Filters:** Removes fields the user shouldn't see.
- **In your stack:** In the Next.js app, the tRPC routers are the BFF.
- **Link to my Keycloak work:** With a BFF, the OIDC flow runs on the server and the browser never sees a token.

See [13.3](/fintech-fullstack-ts#_13-3-bff-in-next-js), [12.4](/resume-star#_12-4-sso-flow-end-to-end).

**15. Design the API contract for a paginated, filterable transactions list.**

- **Pagination:** Cursor-based on a stable sort key, because new transactions keep arriving.
- **Filters:** Explicit typed fields (date range, status, amount range, card brand), validated with Zod.
- **Response:** `{ items, nextCursor }`.
- **Errors:** One error shape across every procedure, with field errors for validation failures.
- **Security:** Merchant scoping in middleware, never from a client parameter.

See [13.6](/fintech-fullstack-ts#_13-6-cursor-pagination), [12.10](/resume-star#_12-10-api-contract-disagreement).

## 14.5 Monorepo

**16. What does Turborepo solve? What does pnpm add?**

- **Turborepo:** Runs tasks across packages in dependency order, caches results by input hash (locally and remotely), and runs only what changed.
- **pnpm:** Links workspace packages with `workspace:*`, stores each package version once, and has strict `node_modules`, so a missing dependency fails straight away.
- **Why it matters to me:** At ICHEC our shared libraries lived in separate repos, so every change meant a release and three upgrades. A monorepo removes that.

See [13.5](/fintech-fullstack-ts#_13-5-pnpm-workspaces-and-turborepo).

**17. How would you structure shared packages?**

- **`apps/`:** The SPA and the Next.js app.
- **`packages/ui`:** Components.
- **`packages/api`:** tRPC routers and the exported `AppRouter` type.
- **`packages/config-*`:** ESLint and TypeScript settings.
- **Rules for every package:** One public entry point, an owner in `CODEOWNERS`, and lint rules that block deep imports and cycles.

See [6. Modular monolith](/architecture-patterns#_6-modular-monolith).

## 14.6 Fintech, fraud and 3DS

**18. What is 3-D Secure?**

The protocol a card issuer uses to check it's really the cardholder making an online payment. It is how European merchants meet PSD2's Strong Customer Authentication rules.

- **Risk scoring:** In 3DS2, the issuer's ACS scores the risk from transaction and device data.
- **Low risk, frictionless:** Approved with no action from the user.
- **Higher risk, challenge:** The user proves who they are in an iframe in the checkout, such as with a one-time code or approval in the banking app.

See [13.8](/fintech-fullstack-ts#_13-8-3-d-secure).

**19. What's hard about UI that runs in an iframe on someone else's page?**

- **Size:** Fixed window sizes, so design for the smallest first.
- **Messaging:** `postMessage` with an explicit target origin, and an `event.origin` check on the way in.
- **Who can embed you:** Controlled with `frame-ancestors`.
- **Cookies:** Third-party cookies are blocked.
- **Timeouts:** The parent page may give up on you.
- **Accessibility:** Focus management and a frame `title`.

See [13.9](/fintech-fullstack-ts#_13-9-embedding-ui-in-an-iframe).

**20. How do you build frontend features securely in a fintech product?**

- **Prevent XSS:** No raw HTML, a strict CSP, and sanitise anything that must be rendered.
- **Keep tokens out of JavaScript:** A BFF and httpOnly cookies.
- **UI checks are UX only:** The server decides permissions. My RBAC work at ICHEC followed the same rule: the backend was the source of truth.
- **Protect card data:** Mask card numbers, and never log card data, codes or tokens.
- **Dependencies:** Audit them, and pin and review updates.

See [8](/browser-security), [12.5](/resume-star#_12-5-frontend-vs-backend-authorisation).

**21. How do you display money correctly?**

Never use floats for money.

- **Storage:** Integers in minor units (cents), or decimal strings.
- **Arithmetic:** On the server, or in minor units.
- **Display:** `Intl.NumberFormat` with the transaction's currency and the viewer's locale. Ask `Intl` for the number of decimals, rather than assuming two.

See [13.10](/fintech-fullstack-ts#_13-10-money-and-card-data-in-the-ui).

## 14.7 Design, performance and CSS

**22. Walk me through turning a Figma mock-up into components.**

1. **Read the whole flow** and find the repeated pieces.
2. **Map them** to design tokens and existing components.
3. **Ask design about the missing states:** Loading, empty, error, long text, narrow screens, permission-limited views.
4. **Build bottom up,** with a story per state.
5. **Review in the browser** with the designer.

My Tailwind and AG Grid toolkit came from doing exactly this across projects. See [13.11](/fintech-fullstack-ts#_13-11-from-design-to-components), [12.8](/resume-star#_12-8-shared-component-toolkit).

**23. How would you make a dashboard with 10,000+ transactions fast?**

Never send 10,000 rows.

- **Data:** Paginate on the server with cursors, or virtualise if the user really must scroll a long list.
- **Filters:** Debounce the inputs and keep them in the URL.
- **Code:** Split by route, so admin-only screens don't load for everyone.
- **Prove it:** Measure with Lighthouse and the Profiler before and after.

See [9](/performance), [12.9](/resume-star#_12-9-performance-on-data-heavy-screens).

**24. How would you build this layout responsively?** (often a live exercise)

- **Grid** for two-dimensional page layout, **Flexbox** for rows of items.
- **Card grids without media queries:** `repeat(auto-fit, minmax(16rem, 1fr))`.
- **Container queries** when a component's layout depends on its container, not the screen.
- **No layout shift:** Reserve space for images and async content.

See [7.4](/css#_7-4-flexbox-vs-grid), [7.5](/css#_7-5-responsive-design).

## 14.8 Testing and quality

**25. What's your testing strategy for a feature?**

- **Vitest** for pure logic: validation, formatting money, permission rules.
- **React Testing Library** for behaviour, querying by role and label, with MSW faking the network.
- **Playwright** for a few critical journeys, including the error path.
- **All on top of** TypeScript and lint in CI.

See [5.6](/react-advanced#_5-6-testing), [12.11](/resume-star#_12-11-testing-strategy-and-ci).

**26. How do you test a component that uses TanStack Query or tRPC?**

- **Components:** A fresh `QueryClient` per test with retries off, wrapped in its provider, and MSW for responses.
- **tRPC procedures:** Call them directly with a server-side caller, without HTTP.

See [13.7](/fintech-fullstack-ts#_13-7-testing-trpc-and-tanstack-query).

**27. What do you look for in a code review?**

In this order:

1. Does it do the right thing, including edge cases and failure paths?
2. Is it secure?
3. Is it accessible?
4. Is it tested?
5. Is it simple enough for the next person?

I explain the why in comments, separate blocking issues from preferences, and turn repeated comments into lint rules. See [10.4](/real-world-skills#_10-4-code-quality-and-code-review), [12.16](/resume-star#_12-16-blocking-a-merge-in-review).

## 14.9 Seniority and fit

**28. Tell me about a non-trivial feature you shaped, not just built.**

The National Service Portal's application and review workflow. I turned the process into a schema-driven form flow and a reviewer grid, which cut administrator review time by 30%. See [12.1](/resume-star#_12-1-owning-a-greenfield-frontend), [12.7](/resume-star#_12-7-dynamic-validated-forms).

**29. Tell me about an architectural decision you influenced.**

The Redux and Context split across our React apps, or ichec-django-core, adopted by three projects. See [12.2](/resume-star#_12-2-redux-vs-context), [12.13](/resume-star#_12-13-pushing-a-technical-decision).

**30. We're an on-site startup and priorities change. How do you work when requirements are unclear?**

1. Find the one problem worth solving first.
2. Build the smallest thing that solves it.
3. Show it early.
4. Write down what's out of scope.

I proposed and built Skill Match this way, and prototyped LLM tools in an innovation sprint. See [12.15](/resume-star#_12-15-working-without-a-spec).

**31. Why fintech, and why Apata?**

My strongest work has been in authentication and access control: Keycloak SSO, OIDC, and role-based access across three portals. Card authentication is the same problem at higher stakes, where the UI has to be fast, trustworthy and secure while someone is mid-payment. **[Add one specific thing about Apata's product that interests you.]**

## 14.10 Live coding exercises

**Debounced search with cancellation**

```tsx
function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function useSearch(term: string) {
  const [state, setState] = useState<{ data: Result[]; error: Error | null; loading: boolean }>({ data: [], error: null, loading: false });
  const q = useDebounced(term);

  useEffect(() => {
    if (!q) return setState({ data: [], error: null, loading: false });
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => { if (error.name !== 'AbortError') setState({ data: [], error, loading: false }); });
    return () => controller.abort(); // a newer term cancels the older request
  }, [q]);

  return state;
}
```

Talk through:

- **Debounce** limits the number of requests.
- **Abort** stops a stale response overwriting a newer one.
- **`encodeURIComponent`** keeps the URL safe.
- **In a real app,** TanStack Query with `q` in the key does all of this.

**Other likely exercises:** a paginated, sortable table ([3](/react-core)); a multi-step form with validation ([12.7](/resume-star#_12-7-dynamic-validated-forms)); `debounce`, `throttle` or `Promise.all` by hand ([1.12](/javascript#_1-12-coding-challenges-to-practise-by-hand)).

## 14.11 System design prompts

**"Design the transactions page of the merchant dashboard."**

1. **Requirements:** Who uses it, how many transactions, how fresh the data must be, and what actions (review, export, refund).
2. **Data:** A tRPC `transactions.list` with cursor pagination and typed filters. Merchant scoping in middleware.
3. **Client:** A TanStack infinite query keyed by filters. Filters and sort in the URL. Virtualised rows if the list is long.
4. **Freshness:** Refetch on focus and on a polling interval, or server-sent events for new transactions.
5. **Permissions:** Roles from the session. Actions hidden in the UI and enforced in the procedure.
6. **States:** Loading skeleton, empty, error with retry, partial failure.
7. **Quality:** Tests at each layer, a performance budget, masked card data, and no sensitive data in logs.

**"Design an embeddable authentication challenge."** Cover the window sizes, `frame-ancestors`, the result going back to the merchant ([13.9](/fintech-fullstack-ts#_13-9-embedding-ui-in-an-iframe)), timeouts and expiry, localisation, accessibility, and a small, fast bundle because it loads mid-checkout. See [10.1](/real-world-skills#_10-1-frontend-system-design) for the general method.

## 14.12 Questions to ask them

- How do the SPA and the Next.js app share code in the monorepo today?
- Is the tRPC layer the BFF for both apps, or only for Next.js?
- What does the frontend team own in the 3DS flow?
- How do you test and release, and how often do you deploy?
- What would success look like for this hire after six months?
