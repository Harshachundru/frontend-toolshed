# 13. Full-stack TypeScript and payments

This page covers what a fintech frontend role adds to the rest of the guide: tRPC, pnpm and Turborepo monorepos, BFF layers in Next.js, Next.js caching, cursor pagination, testing server state, and the payments domain itself (3-D Secure, embedded iframes, money and card data). Each section ends with the questions it prepares you for.

| # | Topic | Builds on |
| --- | --- | --- |
| 13.1 | tRPC | [4. BFF and GraphQL](/architecture-patterns#_4-backend-for-frontend-and-graphql) |
| 13.2 | tRPC with TanStack Query | [4.6 TanStack Query](/react-state#_4-6-server-state-with-tanstack-query) |
| 13.3 | BFF in Next.js | [8.8 Auth on the frontend](/browser-security#_8-8-authentication-on-the-frontend) |
| 13.4 | Next.js caching and revalidation | [5.5 Rendering strategies](/react-advanced#_5-5-rendering-strategies-and-next-js) |
| 13.5 | pnpm workspaces and Turborepo | [6. Modular monolith](/architecture-patterns#_6-modular-monolith) |
| 13.6 | Cursor pagination | 13.2 |
| 13.7 | Testing tRPC and TanStack Query | [5.6 Testing](/react-advanced#_5-6-testing) |
| 13.8 | 3-D Secure | – |
| 13.9 | Embedding UI in an iframe | [8.4 CORS](/browser-security#_8-4-same-origin-policy-and-cors), 13.8 |
| 13.10 | Money and card data in the UI | – |
| 13.11 | From design to components | [7.10 Design system](/css#_7-10-star-example-a-design-system) |

## 13.1 tRPC

tRPC lets a TypeScript frontend call backend functions as if they were local, with the types shared automatically.

### The problem: keeping two sides in sync

- With a normal REST API, the backend and frontend each describe the data separately.
- Rename a field on the server and the frontend still compiles. It breaks in production.
- GraphQL and OpenAPI fix this with a schema file and a code generation step, which is extra work.

### The fix: share the type directly

- You define procedures (functions) on the server.
- The client imports only the router's *type*, never its code.
- The client gets autocomplete and compile errors for every input and output, with no schema file and no code generation.

```ts
// server/routers/transactions.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.context<{ merchantId: string | null }>().create();

const authed = t.procedure.use(({ ctx, next }) => {
  if (!ctx.merchantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { merchantId: ctx.merchantId } });
});

const transactionsRouter = t.router({
  list: authed
    .input(z.object({ cursor: z.string().nullish(), limit: z.number().max(100).default(50) }))
    .query(({ ctx, input }) => db.transactions.page(ctx.merchantId, input)),
  markReviewed: authed
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => db.transactions.markReviewed(ctx.merchantId, input.id)),
});

export const appRouter = t.router({ transactions: transactionsRouter });
export type AppRouter = typeof appRouter; // the only thing the client imports
```

Three things to say in an interview:

- **Input is validated at runtime.** TypeScript types vanish at runtime, so the Zod schema in `.input()` is the real check on what the client sent.
- **Middleware carries auth.** The `authed` procedure checks the session once, and every procedure built on it gets a typed, non-null `merchantId`.
- **The trade-off is coupling.** tRPC only works when both sides are TypeScript and usually live in the same monorepo. For a public API, or clients in other languages, use REST with OpenAPI or GraphQL.

| | tRPC | GraphQL + CodeGen | REST + OpenAPI |
| --- | --- | --- | --- |
| Where types come from | Inferred from server code | Generated from the schema | Generated from the spec |
| Build step | None | Codegen | Codegen |
| Clients in other languages | No | Yes | Yes |
| Client picks fields | No | Yes | No |
| Best for | One team, TS on both sides, a BFF | Many clients, nested data | Public and cross-team APIs |

**Bridge from your experience:** "I've used GraphQL CodeGen to get typed contracts. tRPC gets the same safety without the codegen step, because the client imports the router's type directly."

## 13.2 tRPC with TanStack Query

tRPC's React integration is built on TanStack Query. Every procedure becomes a query or mutation with the caching, deduplication and background refetching described in [4.6](/react-state#_4-6-server-state-with-tanstack-query). With the current `@trpc/tanstack-react-query` package you get query options and keys from tRPC and use the normal TanStack hooks:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '../trpc';

type Page = { items: { id: string; reviewed: boolean }[]; nextCursor: string | null };

function ReviewButton({ id }: { id: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listKey = trpc.transactions.list.queryKey();

  const markReviewed = useMutation(
    trpc.transactions.markReviewed.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueriesData({ queryKey: listKey });
        queryClient.setQueriesData({ queryKey: listKey }, (old: Page | undefined) =>
          old && { ...old, items: old.items.map((t) => (t.id === id ? { ...t, reviewed: true } : t)) });
        return { previous };
      },
      onError: (_err, _vars, context) => {
        context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
    }),
  );

  return <button onClick={() => markReviewed.mutate({ id })}>Mark reviewed</button>;
}
```

The optimistic pattern is: **snapshot, apply, roll back on error, invalidate when settled**. In a payments product, say when you would *not* do this: anything that moves money or changes a decision a customer relies on should wait for the server's confirmation and show a pending state instead.

## 13.3 BFF in Next.js

A backend for frontend (BFF) is a thin server layer owned by the frontend team that shapes data for one UI. In a Next.js app, tRPC procedures, route handlers and Server Actions *are* the BFF.

What it gives you:

- **Tokens stay on the server.** The browser holds only an httpOnly, `Secure`, `SameSite` session cookie. The BFF swaps it for the access token and calls the backend services. XSS can no longer read the token (see [8.2](/browser-security#_8-2-client-side-storage) and [8.8](/browser-security#_8-8-authentication-on-the-frontend)).
- **One call per screen.** The BFF combines several service calls and returns exactly the shape the screen needs.
- **Secrets and filtering on the server.** API keys never ship to the client, and fields the user must not see (full card numbers, internal risk scores) are removed before the response leaves.

What it costs: another service to run, an extra network hop, and CSRF protection is needed again because auth is now a cookie.

**How it links to your Keycloak work:** in a pure SPA the browser held the tokens (memory and silent refresh). With a BFF, the same OIDC Authorization Code flow runs on the server, which is the confidential client, and the SPA never sees a token. That is the more secure design for a payments product.

## 13.4 Next.js caching and revalidation

Since Next.js 15, `fetch` in Server Components is **not cached by default**. You opt in per request, and tag data so you can clear it precisely:

```ts
// Cached for 60 s and tagged
const rates = await fetch(`${API}/fx-rates`, { next: { revalidate: 60, tags: ['fx-rates'] } });

// Per-user, real-time data: always fresh
const alerts = await fetch(`${API}/alerts`, { cache: 'no-store', headers: { cookie } });
```

```ts
'use server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function updateRates() {
  await saveRates();
  revalidateTag('fx-rates');        // every cached fetch with this tag
  revalidatePath('/settings/rates'); // or one route
}
```

The rule for a payments app: cache shared, slow-changing data (reference data, rates, docs). Never cache per-merchant or per-user data on a shared cache, and treat fraud alerts and transaction state as always fresh. Newer Next.js versions add a `'use cache'` directive with `cacheLife` and `cacheTag`; the idea is the same.

## 13.5 pnpm workspaces and Turborepo

A monorepo holds several apps and shared packages in one repository.

### The problem: shared code in separate repos

- A shared component library in its own repo needs a release, then an upgrade in every app that uses it.
- A one-line fix becomes three merge requests.

### The fix: two tools

- **pnpm:** Installs the packages and links them to each other, so an app uses the shared package's current code directly.
- **Turborepo:** Runs tasks such as build and test across the packages in the right order, and caches the results so unchanged packages are skipped.

```text
apps/
  merchant-dashboard/     # Vite + React SPA
  portal/                 # Next.js + tRPC
packages/
  ui/                     # shared components
  api/                    # tRPC routers, exports AppRouter type
  config-eslint/
  config-typescript/
pnpm-workspace.yaml
turbo.json
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// apps/merchant-dashboard/package.json (excerpt)
{ "dependencies": { "@acme/ui": "workspace:*", "@acme/api": "workspace:*" } }
```

```json
// turbo.json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

| Concept | What to say |
| --- | --- |
| `workspace:*` | Depend on the local package, not a published version. A change in `ui` is used by both apps straight away. |
| Strict `node_modules` | pnpm only lets a package import what it declares. No **phantom dependencies** that work by accident because something else installed them. |
| Content-addressed store | Each package version is stored once on disk and hard-linked, so installs are fast and small. |
| `^build` | Build a package's dependencies first. Turborepo works out the order from the dependency graph. |
| Caching | Turborepo hashes inputs. If nothing changed, it replays the cached output and logs. Remote caching shares this across CI and the team. |
| Filtering | `turbo run build --filter=merchant-dashboard...` builds the app and what it depends on. `--affected` runs only what changed against the main branch. |

**Bridge from your experience:** "At ICHEC, shared code lived in separate repos (the Tailwind and AG Grid toolkit, ichec-django-core), so every change meant a release and an upgrade in three projects. A monorepo with `workspace:*` removes that step, and Turborepo keeps CI fast by only rebuilding what changed."

## 13.6 Cursor pagination

Pagination means loading a long list in pages, not all at once.

### The problem: offset pagination on live data

- Offset pagination asks for "rows 101 to 150" (`?page=3&size=50`).
- If a new transaction arrives while you read page 2, every row shifts down by one.
- Page 3 then starts with a row you already saw, or skips one.

### The fix: cursor pagination

- Ask for "the next 50 after this item", not "rows 101 to 150".
- The cursor is a stable sort key from the last row you received, such as `(created_at, id)`.
- New rows arriving at the top can't shift what comes after your cursor.

```ts
const trpc = useTRPC();
const query = useInfiniteQuery(
  trpc.transactions.list.infiniteQueryOptions(
    { limit: 50 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  ),
);
const rows = query.data?.pages.flatMap((p) => p.items) ?? [];
```

With an infinite query the cache holds `{ pages, pageParams }`, not a single page, so an optimistic update like the one in 13.2 must map over every page.

### Which to use

- **Offsets:** When the user needs to jump to page 40, and the data is stable.
- **Cursors:** Feeds, logs and transactions.
- **Either way:** Keep filters and sort in the URL, so a view can be shared and survives a reload.

## 13.7 Testing tRPC and TanStack Query

**Server procedures:** call them directly with a caller, no HTTP needed.

```ts
const createCaller = t.createCallerFactory(appRouter);

test('rejects requests without a merchant', async () => {
  const caller = createCaller({ merchantId: null });
  await expect(caller.transactions.list({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
});
```

**Components:** give each test a fresh `QueryClient` with retries off, so one test's cache can't leak into the next and failures show straight away. Mock the network with MSW, as in [5.6](/react-advanced#_5-6-testing).

```tsx
function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
```

**End to end:** Playwright for the journeys that matter: sign in, filter transactions, review one, and the error path when the API fails.

## 13.8 3-D Secure

3-D Secure (3DS) is how a card's bank checks that it's really the cardholder making an online payment.

### The problem: stolen card numbers

- Online, the shop never sees the physical card. Anyone with the number, expiry date and CVV can pay.
- In Europe, PSD2's Strong Customer Authentication (SCA) rules require an extra check on most online payments.

### The fix: let the bank decide

- **Version 1** showed every customer a password pop-up. Many gave up mid-payment.
- **Version 2 (EMV 3DS)** checks the risk first. Most payments go through with no extra step, and only risky ones get a challenge.

| Party | Who runs it | Role |
| --- | --- | --- |
| 3DS Requestor and 3DS Server | Merchant, or its payment provider | Starts authentication and sends device and transaction data |
| Directory Server (DS) | Card scheme (Visa, Mastercard) | Routes the request to the right issuer |
| ACS (Access Control Server) | Issuer, or a vendor on its behalf | Scores the risk, decides, and runs the challenge |

The flow:

1. **3DS Method (optional).** A hidden iframe loads an ACS URL so the issuer can collect browser and device data.
2. **Authentication request (AReq/ARes).** The 3DS Server sends transaction, device and cardholder data through the DS to the ACS.
3. **Frictionless or challenge.** If the risk is low, the ACS approves straight away (frictionless). Otherwise it asks for a challenge.
4. **Challenge (CReq/CRes).** The merchant's page opens an iframe or modal and POSTs a challenge request to the ACS. The ACS shows its challenge UI: a one-time code, approval in the banking app, or biometrics. When done, the ACS POSTs the result to the merchant's notification URL inside that iframe.
5. **Result (RReq/RRes).** The ACS also sends the final result to the 3DS Server, and the payment goes ahead with that authentication.

**Why a frontend developer cares:** if the product sits on the issuer side, the challenge page *is* the frontend. It runs inside someone else's checkout, at a fixed window size (from 250×400 up to full screen), on any device and in any browser. It must be fast, accessible, localised and secure, because the cardholder is mid-payment. A merchant-facing dashboard, meanwhile, shows authentication outcomes, fraud rules and analytics.

::: tip Before the interview
Read the company's site and work out where its product sits in this table (issuer side, merchant side, or both). It changes which frontend problems they have.
:::

## 13.9 Embedding UI in an iframe

UI that runs inside another site's page (a payment challenge, a card form, a widget) has constraints a normal app does not.

| Constraint | What to do |
| --- | --- |
| Who may embed you | `Content-Security-Policy: frame-ancestors` lists allowed parent origins; `X-Frame-Options` is the older form. This also stops clickjacking. |
| Talking to the parent | `postMessage`, always with an explicit `targetOrigin`, and check `event.origin` on every message you receive. |
| Fixed size | Design for the smallest window first. Avoid layout that needs the parent to resize. |
| Cookies | Browsers block or partition third-party cookies, so don't rely on cookies inside the iframe. Pass state in the request instead. |
| Timeouts | The parent will give up after a set time. Show progress and handle "expired" clearly. |
| Accessibility | Focus must move into the frame when it opens, and the frame needs a `title`. |

```ts
// Inside the iframe: tell the parent we're done
window.parent.postMessage({ type: 'challenge-complete', status: 'Y' }, 'https://merchant.example.com');

// In the parent: accept messages only from the expected origin, with the expected shape
const Message = z.object({ type: z.literal('challenge-complete'), status: z.enum(['Y', 'N']) });

window.addEventListener('message', (event) => {
  if (event.origin !== 'https://acs.example.com') return;
  const parsed = Message.safeParse(event.data);
  if (!parsed.success) return;
  onComplete(parsed.data.status);
});
```

Never use `'*'` as the target origin for anything sensitive: any page that manages to frame you would receive the message.

## 13.10 Money and card data in the UI

### The problem: floats can't hold money exactly

- JavaScript numbers are floating point, which can't represent most decimal fractions exactly: `0.1 + 0.2 === 0.30000000000000004`.
- Rounding errors on money add up, and the totals stop matching.

### The fix: whole numbers

- **Store and send money as integers in minor units** (cents), or as decimal strings.
- **Don't assume two decimals:** JPY has none and KWD has three. Ask `Intl` instead of hard-coding `/ 100`:

```ts
function formatMoney(minor: number, currency: string, locale = 'en-IE') {
  const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency });
  const digits = fmt.resolvedOptions().maximumFractionDigits ?? 2;
  return fmt.format(minor / 10 ** digits);
}

formatMoney(123456, 'EUR');          // "€1,234.56"
formatMoney(123456, 'EUR', 'de-DE'); // "1.234,56 €"
formatMoney(1500, 'JPY');            // "¥1,500"
```

The currency belongs to the transaction; the locale belongs to the viewer. Keep them separate. Do arithmetic (totals, fees) in minor units, or on the server, and format only for display.

**Card data:**

- Show a masked card number: brand and last four digits (`Visa •••• 4242`). The frontend should never receive the full number unless it is a PCI-scoped payment form.
- Never log card numbers, CVVs, one-time codes or tokens, including in error reporting and analytics. Scrub them in the logger.
- Card entry fields usually live in an iframe hosted by the payment provider, so the merchant's page never touches raw card data. This keeps the merchant out of most PCI DSS scope.

## 13.11 From design to components

A process to describe when asked "how do you turn a mock-up into components?":

1. **Read the whole flow first,** not one screen. Find the repeated pieces: tables, filters, status badges, empty states.
2. **Map to what exists.** Use design tokens (colour, spacing, type) and existing components. Raise anything that doesn't fit the system with the designer rather than adding a one-off.
3. **Ask about the states the mock-up doesn't show:** loading, empty, error, partial data, very long text, narrow screens, keyboard focus, and permission-limited views.
4. **Build from the bottom up** with stories for each state (Storybook), then compose the screen.
5. **Review with the designer** in the browser, on real data, before merge.

For performance, decide early what can render on the server, what needs to be interactive, and which parts handle large data (virtualise long lists, paginate on the server).

## 13.12 Interview questions with model answers

**Q: Why would a team choose tRPC over REST or GraphQL?**
When one team owns both a TypeScript client and its BFF, tRPC gives end-to-end types with no schema or codegen, so a server change that breaks the client fails to compile. It's the wrong choice for a public API or clients in other languages.

**Q: What does Turborepo actually save you?**
Time and mistakes. It runs tasks in dependency order, caches their outputs by input hash, and with filtering or `--affected` only rebuilds and tests what a change touched. Remote caching means CI and teammates reuse each other's builds.

**Q: What's a phantom dependency?**
A package you import but never declared, which works only because something else installed it. pnpm's strict `node_modules` makes it fail immediately instead of breaking later when the other package drops it.

**Q: Why put a BFF in front of the backend?**
To shape data for one UI, combine calls, and keep tokens and secrets on the server behind an httpOnly cookie. The cost is another service to run and the need for CSRF protection.

**Q: Explain frictionless vs challenge in 3DS2.**
The issuer's ACS scores the risk from transaction and device data. Low risk is approved without user action (frictionless). Higher risk triggers a challenge, shown in an iframe in the merchant's checkout, such as a one-time code or approval in the banking app.

**Q: How do you communicate safely between an iframe and its parent?**
`postMessage` with an explicit target origin, and on receipt, check `event.origin` and validate the message shape. Control who can embed you with `frame-ancestors`.

**Q: How do you handle currency in the frontend?**
Integers in minor units or decimal strings, never floats; arithmetic on the server or in minor units; `Intl.NumberFormat` for display, with the currency from the data and the locale from the user.
