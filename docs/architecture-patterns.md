<script setup>
import {
  mvcSteps, bffActors, bffScenarios,
  deliveryActors, deliveryScenarios, federationSteps,
} from './.vitepress/theme/architecture/data'
</script>

# Frontend architecture patterns

Senior frontend interviews test architectural trade-offs more than code. You should be able to say why a product uses a monolith or micro frontends, SSR or static generation, and a BFF or a plain REST API, and what each choice costs.

This page follows the patterns in the order the industry adopted them. Each one solved the biggest problem of the one before, and created a new one. Knowing that chain is what lets you defend a choice in an interview. The page ends with an [audit](#_10-audit-your-own-architecture) that turns your current project into a senior-level answer.

<ArchitectureEvolution />

Every pattern moves logic between the server and the browser:

- **Thin client:** The server does most of the work. The browser mainly displays what it is sent.
- **Thick client:** The browser holds routing, state and business rules. The server mostly supplies data.

Watch the slider in the diagram move as you click through the eras.

## 1. Static pages

A static page is a ready-made HTML file that the server sends, unchanged, to everyone.

### How it works

- You write HTML and CSS files, with a little JavaScript.
- A server, or later a CDN, hands out the same file to every visitor.

### The catch

- Nothing is personal: everyone sees the same page.
- Nothing is interactive beyond simple scripts, and every change means editing a file.

| Gain | Pain | Use it today for |
| --- | --- | --- |
| Instant loads, trivial hosting, nothing to break | No user data, no interaction, every change is a file edit | Landing pages, docs, status pages |

Static pages came back as [static site generation](#_5-ssg-isr-ssr-and-server-components), with modern tooling on top.

## 2. Server MVC

Server MVC builds a fresh HTML page on the server for every request. Rails, Django, ASP.NET, Spring MVC and Laravel all work this way.

### The problem it solved

- Static pages can't show your orders, your account or anything that changes per user.

### How it works: three parts

- **Controller:** Receives the request, such as "show order 42", and decides what to do.
- **Model:** Loads the data, such as order 42 from the database.
- **View:** A template that turns that data into HTML.

### The catch

- Every click reloads the whole page, because only the server can build HTML.
- The frontend is tied to the backend's templates, so it is hard to change one without the other.

<StepFlow title="One request in a server MVC app" :steps="mvcSteps" />

| Gain | Pain |
| --- | --- |
| Dynamic pages with real business logic, simple mental model, good SEO | Full page reload on every click, frontend tightly coupled to backend templates, hard to move off the framework |

Server MVC is still a good choice for internal tools and CRUD apps. Modern versions add interactivity without a full SPA: Hotwire (Rails), Livewire (Laravel) and htmx swap parts of the page with server-rendered HTML.

**In an interview:** "MVC keeps the client thin: all logic and rendering are on the server. That is simple and SEO-friendly, but every interaction costs a round trip and a page reload."

## 3. Single-page applications

A single-page application (SPA) downloads the whole app once, then the browser draws every screen itself. React, Vue and Angular apps work this way.

### The problem it solved

- Server MVC reloads the whole page on every click, which feels slow and clunky.

### How it works

- The browser downloads the app's JavaScript once.
- Clicking a link changes the screen in the browser, with no page reload.
- The server becomes a JSON API that only sends data.
- Routing, state, rendering and form validation all move into the browser. The frontend engineer role exists because of this shift.

### The catch

- The bundle gets large, and the user sees a blank screen until the JavaScript runs.
- Search engines may see an empty page.
- The browser now holds a lot of state, which is hard to keep correct.

| Moved to the browser | Stayed on the server |
| --- | --- |
| Routing, rendering, UI state, form validation for UX, some business rules | Data, authorisation, the real validation, business rules that must be trusted |

Never trust the client. Validation and permission checks in the browser are for user experience. The server must repeat them, because anyone can change the JavaScript.

| Gain | Pain |
| --- | --- |
| Rich, app-like interactivity with no reloads; static assets scale cheaply on a CDN | Large JS bundles, a blank screen until JS runs, weak SEO, complex client state |

### React and TypeScript tools

| Need | Tools |
| --- | --- |
| Build and dev server | Vite (`npm create vite@latest -- --template react-ts`) |
| Routing | React Router, TanStack Router (fully typed routes) |
| Server data and caching | TanStack Query, SWR, RTK Query |
| Client state | `useState`, `useReducer`, Zustand, Redux Toolkit |
| Typed API contracts | OpenAPI + `openapi-typescript`, Zod for runtime validation |

**In an interview:** "An SPA is a thick client. It is a good fit behind a login, where users return often and SEO does not matter. For public pages, its blank first screen and bundle size are the problem every later pattern tries to fix."

## 4. Backend for frontend and GraphQL

A backend for frontend (BFF) is a small server built for one client app. It gathers data from many services and returns exactly what that app's screens need.

### The problem it solved

- When mobile apps arrived, the web app, the iPhone app and the Android app all called the same API.
- **Over-fetching:** The API returned more fields than a small phone screen needed.
- **Under-fetching:** One screen needed data from five services, so it made five requests over a slow mobile network.

### Fix 1: a BFF per client

- Each client gets its own thin backend.
- The BFF calls the underlying services, combines the results, and returns one response shaped for one screen.
- The frontend team usually owns the BFF, so frontend engineers increasingly need backend skills.

### Fix 2: GraphQL

- One gateway for every client. Each client writes a query that lists exactly the fields it wants.
- That fixes over-fetching and under-fetching in one place.
- The catch is server-side work: schema design, the N+1 problem (one query for a list, then one more query for every item), and limits on expensive queries.

<SequenceDiagram
  title="Shared API, BFF and GraphQL"
  hint="Compare how many round trips the client makes in each scenario."
  :actors="bffActors"
  :scenarios="bffScenarios"
/>

| Gain | Pain |
| --- | --- |
| Endpoints shaped per screen, fewer round trips, auth and TLS handled once, backend teams release independently behind it | An extra network hop, another service to run and monitor, a single point of failure, GraphQL's learning curve |

### React and TypeScript tools

| Need | Tools |
| --- | --- |
| BFF in TypeScript | Node with Fastify, Hono or NestJS; Next.js route handlers and server actions |
| End-to-end types without a schema | tRPC (types flow from the BFF to React with no code generation) |
| GraphQL client | Apollo Client, urql, Relay |
| Typed GraphQL operations | GraphQL Code Generator, `gql.tada` |
| N+1 fix on the server | DataLoader |

**In an interview:** "A BFF tailors the API to each client and hides the microservices behind it. I would add one when several clients need different shapes, or when the frontend makes many calls per screen. It costs a hop and a service to run."

## 5. SSG, ISR, SSR and server components

These four strategies render React components into HTML before the browser gets them. Meta-frameworks such as Next.js, Nuxt, Astro and React Router (formerly Remix) provide them.

### The problem they solve

- SPAs ship too much JavaScript and show a blank screen first.
- The fix is to render on the server again, like MVC, but keep writing components.

### The difference is when the HTML is made

| Strategy | When HTML is made | Freshness | Cost to run | Good for |
| --- | --- | --- | --- | --- |
| **SSG** static site generation | At build time | Until the next deploy | Very low: files on a CDN | Docs, blogs, marketing |
| **ISR** incremental static regeneration | At build, then again in the background after a TTL | Within the TTL | Low | Catalogues, listings, news |
| **SSR** server-side rendering | On every request | Always fresh | Servers scale with traffic | Personalised or real-time pages |
| **RSC** React server components | On the server, per request or at build | Either | As SSR | Less JS to download and hydrate |

<SequenceDiagram
  title="How a page reaches the browser"
  hint="Step through the same request under SSG, ISR and SSR."
  :actors="deliveryActors"
  :scenarios="deliveryScenarios"
/>

### The catch: SSR still ships all the code

- **Hydration:** SSR fixes the blank screen, but buttons don't work until the browser downloads the component code and attaches it to the HTML.
- **Server components:** Leave display-only components out of the browser bundle, so there is less to download and hydrate.
- **Islands (Astro):** Start from the other side. The page is static HTML, and only marked islands load JavaScript.

The [core concepts page](/core-concepts#_11-server-side-rendering) has an interactive timeline of all of these.

### Choose per route, not per app

A typical product serves marketing pages with SSG, product pages with ISR, the account page with SSR, and a dashboard as a client-rendered SPA.

<RenderingPicker />

| Gain | Pain |
| --- | --- |
| The best load performance and SEO we know of, with full interactivity | Servers to run and scale, steep learning curve, upgrades driven by the framework, hydration bugs |

Some teams move to Next.js before performance is their problem, then struggle with the complexity. Adopt SSR when LCP, SEO or first-visit conversion is a measured bottleneck.

### React and TypeScript tools

| Need | Tools |
| --- | --- |
| Full framework | Next.js App Router, React Router framework mode, TanStack Start |
| Static and islands | Astro (with React islands), VitePress for docs |
| SSG and ISR in Next.js | `generateStaticParams`, `export const revalidate = 60`, `revalidateTag()` |
| Typed loaders and params | React Router `Route.LoaderArgs`, Next.js typed routes |
| Server-only code | `'use client'` / `'use server'` boundaries, the `server-only` package |

**In an interview:** "SSG and ISR are cheapest and fastest when content is shared. SSR is for personalised or always-fresh pages, and server components cut the JS that SSR still ships. I choose per route, and only pay for server rendering where a metric needs it."

## 6. Modular monolith

A modular monolith is one app, deployed as one unit, whose code is split into walled-off modules.

### The problem it solves

- As one SPA grows to dozens or hundreds of engineers, any file can import any other file.
- Code turns into a tangle, and a change in checkout breaks the user profile.

### The fix: modules with strict boundaries

- **Platform layer:** Owned by a platform team. It holds the design system, global CSS, shared hooks, auth, data fetching, logging and analytics.
- **Domain modules:** Owned by feature teams, such as user, catalogue, checkout and payments. Each one exposes a public API through its `index.ts` and hides everything else.
- **One direction:** The app may import domains, and domains may import the platform. Never the other way.

### The catch

- Drawing the boundaries is easy. Keeping them is hard, because nothing stops a developer importing a private file.
- A lint rule in CI is what makes the boundaries hold.

<BoundaryDemo />

### Example structure

```text
src/
  app/                    routes and composition only
  domains/
    checkout/
      index.ts            the public API: the only file others may import
      components/
      hooks/
      api/
      store/              private
    payments/
    user/
  platform/
    design-system/
    auth/
    data-client/
    analytics/
```

```js
// eslint.config.js (eslint-plugin-boundaries)
'boundaries/element-types': ['error', {
  default: 'disallow',
  rules: [
    { from: 'app', allow: ['domains', 'platform'] },
    { from: 'domains', allow: ['domains', 'platform'] },  // other domains only via index.ts
    { from: 'platform', allow: ['platform'] },
  ],
}],
```

| Gain | Pain |
| --- | --- |
| Order in a big codebase, clear ownership, many teams in one repo, one deployment to reason about | Boundaries erode without tooling, global state couples modules, long builds, one shared release train |

### React and TypeScript tools

| Need | Tools |
| --- | --- |
| Enforce boundaries | `eslint-plugin-boundaries`, Nx `enforce-module-boundaries`, `dependency-cruiser` |
| Workspace and fast builds | Nx, Turborepo, pnpm workspaces (build and test only what changed) |
| Public APIs | One `index.ts` per module; TypeScript project references; `paths` aliases like `@domains/*` |
| Ownership | `CODEOWNERS` per module |
| Shared UI | A design system package with Storybook |

**In an interview:** "A modular monolith gives most of the benefits of micro frontends, such as ownership and isolation, with one build and one deploy. I would try it before splitting into separate apps."

## 7. Clean and hexagonal architecture

Clean, hexagonal and onion architecture all put your business rules at the centre, where no framework, database or API can reach them.

### The problem they solve

- Business rules, such as how a price is calculated, end up mixed into components and API calls.
- Changing the framework or the API then means rewriting the rules too, and you can't test the rules without the whole app.

### The fix: dependencies point inward

- **The core:** Business rules in plain code that imports nothing from the outside world.
- **Clean architecture:** Names the rings from the inside out: entities, use cases, interface adapters, frameworks.
- **Hexagonal architecture (ports and adapters):** Focuses on the edges. The core defines **ports**, interfaces such as "something that can load an order". **Adapters** plug real technology into those ports: REST, GraphQL, storage, or a fake for tests.

<OnionDiagram />

### The catch on the frontend

- Frameworks such as Next.js and Angular already impose a structure.
- Most frontends are thin, with little business logic to protect.
- Projects rarely change framework, so building for that is usually over-engineering.

### When to use it

- **The full version:** For long-lived products with real client-side logic, such as pricing, editors or offline sync.
- **The light version, everywhere:** Keep business rules in plain TypeScript functions outside components, and put API calls behind a typed function. Then the rules are easy to unit-test.

### React and TypeScript tools

| Need | Tools |
| --- | --- |
| Ports | TypeScript `interface` types owned by the domain |
| Adapters | Plain modules implementing those interfaces (fetch, Apollo, IndexedDB) |
| Injecting adapters into React | Context providers, or passing the repository to custom hooks |
| Test adapters | In-memory fakes, MSW (Mock Service Worker) for HTTP |
| Framework-free domain tests | Vitest on pure functions |

**In an interview:** "I know clean and hexagonal architecture, and use their core idea: domain logic in framework-free TypeScript behind interfaces. But I would not build full layers in a typical React app. The framework's conventions cover 99% of cases."

## 8. Micro frontends

Micro frontends take the domains of a modular monolith and ship each one as a separate app.

### The problem they solve

- In a modular monolith, every team still shares one build and one release.
- With hundreds of engineers, one team's broken test blocks everyone's deploy.

### The fix: separate apps, joined at runtime

- **Vertical slice:** Each team owns one area end to end, often its UI, its BFF and its services, and releases it on its own schedule.
- **Shell:** A host app loads the other apps in the browser and owns what they share: layout, routing, auth, language, theme and the design system.

<StepFlow title="Runtime composition with Module Federation" :steps="federationSteps" />

<MicroFrontendsDemo />

| Gain | Pain |
| --- | --- |
| Hundreds of engineers ship in parallel, independent deploys and rollbacks, teams can upgrade at their own pace | Slower page loads (more requests, possibly duplicated libraries), visual and UX drift, hard cross-app testing, a lot of platform work |

### The catch

- Micro frontends scale **people**, not performance.
- At a small company they make you slower. You pay the platform cost without having the coordination problem they solve.
- Smaller companies still ask about them in interviews, so know when they fit and how they work at a high level.

### Composition options

| Approach | How it works | Trade-off |
| --- | --- | --- |
| Runtime (Module Federation) | The shell loads each app's `remoteEntry.js` and shares React as a singleton | Most flexible; needs version discipline for shared dependencies |
| Build time (npm packages) | Each app is a package installed into the shell | Simple, but every release needs a shell redeploy, so it is not truly independent |
| Server or edge composition | Fragments assembled into one HTML response (SSI, edge workers) | Fast first paint; harder to share client state |
| Iframes | Each app in its own frame | Strong isolation; poor UX, layout and accessibility |
| Web Components | Each app exposes a custom element | Framework-neutral boundary; SSR and styling are harder |

### React and TypeScript tools

| Need | Tools |
| --- | --- |
| Runtime composition | Module Federation (webpack 5, Rspack, `@module-federation/vite`) |
| App lifecycle across frameworks | single-spa |
| Typed contracts | A shared package of event and prop types; `@module-federation/enhanced` can generate types for remotes |
| Communication | `CustomEvent`, `BroadcastChannel`, a small event bus |
| Consistency | A shared design system and tokens, owned by the platform team |

**In an interview:** "Micro frontends solve an organisational problem: too many teams blocking each other in one deploy. I would only pick them for a large organisation with independent release needs, and keep the contract between apps to typed events and a shared design system."

## 9. All patterns side by side

Scores are relative judgements from 1 (low) to 5 (high), for comparing the patterns with each other.

| Pattern | Infra scalability | Performance | Complexity | Team size | Product value | Upfront cost | Pick it when |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Static pages | 5 | 5 | 1 | 1 | 1 | 1 | Content is the same for everyone and rarely changes |
| Server MVC | 2 | 2 | 2 | 2 | 2 | 2 | CRUD and internal tools; a backend-heavy team |
| SPA | 4 | 3 | 3 | 3 | 3 | 3 | App-like product behind a login |
| BFF / GraphQL | 4 | 3 | 4 | 4 | 4 | 4 | Several clients, many services, chatty screens |
| SSG / ISR | 5 | 5 | 3 | 3 | 3 | 2 | Public content, SEO, shared pages |
| SSR + server components | 3 | 5 | 5 | 3 | 4 | 4 | Public and personalised, performance is measured as a bottleneck |
| Modular monolith | 4 | 3 | 3 | 4 | 4 | 3 | One codebase is getting crowded |
| Micro frontends | 5 | 2 | 5 | 5 | 5 | 5 | Many teams need independent releases |

These patterns combine. A real system might be a modular monolith with SSG and SSR routes behind a BFF, or a set of micro frontends that are each Next.js apps.

## 10. Audit your own architecture

Before an interview, write down three things about the project you work on now:

1. **What is the current architecture?** Name every pattern in use: rendering strategy per route, data layer, code organisation.
2. **Why did it end up there?** Which constraint (team size, SEO, deadlines, legacy code) drove each choice?
3. **What is the natural next step?** Which pain is growing, and which pattern addresses it? What would it cost?

<AuditBuilder />

Compare these two answers to "Tell me about your current project's architecture".

::: danger Mid-level answer
"We use React and Next.js."
:::

::: tip Senior answer
"We serve marketing pages with static generation, and use SSR for personalised pages. The repository is a modular monolith with lint-enforced boundaries between domains. As we grow we have considered micro frontends, but we are not there yet, because we release as one team and the platform cost would slow us down."
:::

The senior answer names patterns, gives reasons, and shows awareness of the next step and its cost. Strong technical interviews often end in a vague rejection ("we went with someone more experienced") when the candidate wrote good code but never showed this kind of reasoning.
