# 12. Resume STAR questions and answers

These are the technical STAR questions an interviewer is most likely to ask about my own resume, with a model answer for each and the follow-ups that usually come next. They are tuned for a senior frontend role where authentication and performance matter.

::: warning Fill the gaps before you use these
Text in **[square brackets]** is a detail the resume does not give, such as a specific bug or a before and after number. Replace each one with what really happened. If you can't remember, say so in the interview rather than guess: interviewers probe numbers.
:::

| # | Question theme | Project to draw on |
| --- | --- | --- |
| 12.1 | Owning a greenfield frontend | National Service Portal |
| 12.2 | Redux vs Context | National Service Portal |
| 12.3 | Server and Client Components | ICHEC portal (Next.js prototype) |
| 12.4 | SSO flow end to end | Keycloak on all three portals |
| 12.5 | Frontend vs backend authorisation | National Service Portal |
| 12.6 | Debugging an auth bug | Keycloak token refresh |
| 12.7 | Dynamic, validated forms | Application and review workflows |
| 12.8 | Shared component toolkit | Tailwind and AG Grid toolkit |
| 12.9 | Performance on data-heavy screens | AG Grid admin screens |
| 12.10 | API contract disagreement | DRF/FastAPI and GraphQL |
| 12.11 | Testing strategy and CI | GitLab CI, Playwright |
| 12.12 | Production issue from monitoring | Grafana |
| 12.13 | Pushing a technical decision | ichec-django-core |
| 12.14 | Mentoring | 3 junior developers |
| 12.15 | Working without a spec | Skill Match, LLM prototypes |
| 12.16 | Blocking a merge in review | Code review |
| 12.17 | A mistake I made | Your choice |
| 12.18 | Using AI tools safely | Claude, Cursor, Copilot |

## 12.1 Owning a greenfield frontend

> "Tell me about a frontend you built from scratch. What decisions did you make early, and what would you change?"

**Why they ask:** to see whether you can make and defend architecture decisions, not just build screens.

- **Situation:** ICHEC needed a National Service Portal where researchers and SMEs apply for compute and services, and administrators review those applications. Before, much of this ran through email and spreadsheets.
- **Task:** I owned the frontend from the first screen to production, and needed a base the team could keep building on.
- **Action:** I made four early decisions. React with TypeScript, so the API shapes were typed from day one. A clear state split: Redux for shared state such as the signed-in user, roles and application records, and Context for local state like wizard steps. A shared Tailwind and AG Grid toolkit, so tables, filters and form fields looked and behaved the same everywhere. And role-based routing built into the router from the start, rather than added later. I wrote these down in a design doc so new engineers could follow the reasoning.
- **Result:** The portal serves 500–700 daily users. Administrator review time fell by 30% and application processing became 50% faster, because reviewers got structured, validated data in one grid instead of chasing missing details.

**Follow-ups**

- *How did you measure the 30%?* **[Say how: e.g. average time from submission to decision, before and after, over N months.]**
- *What would you change?* I'd keep server data out of Redux and use RTK Query or TanStack Query for it. Caching, refetching and loading states would come for free, and Redux would only hold true client state.
- *How did you handle the external and internal user groups?* Same app, different roles in the token, and different routes and navigation per role.

## 12.2 Redux vs Context

> "Walk me through how you split state between Redux and Context."

**Why they ask:** state is where large React apps go wrong. They want a rule, not a preference.

- **Situation:** The portal had large, data-heavy screens: application lists, review panels and multi-step forms, all needing the user's roles.
- **Task:** Keep state predictable and avoid both prop drilling and needless re-renders.
- **Action:** I used one rule: if many unrelated parts of the app read it or change it, it goes in Redux. If one subtree owns it, it goes in Context or local state. So the auth user, roles and application records lived in Redux with typed slices and selectors. Form wizard progress, grid column settings and UI toggles lived in Context scoped to that screen. I split providers by concern, so a change to wizard state didn't re-render the whole app, and memoised context values.
- **Result:** Screens stayed fast and the data flow was easy to trace in Redux DevTools. New engineers could tell where state belonged by asking one question.

**Follow-ups**

- *Why does Context cause re-renders?* Every consumer re-renders when the provider's value changes identity. Split contexts, memoise the value with `useMemo`, or separate state and dispatch into two contexts.
- *Where should server data live?* In a server-state cache (RTK Query, TanStack Query, Apollo), not hand-written Redux. That's what I'd change (see 12.1).
- *Would you pick Redux today?* For a big multi-team app with shared client state, yes, as Redux Toolkit. For a smaller app, Zustand or Context plus a query library is enough.

## 12.3 Server and Client Components

> "Why did you split the ICHEC portal prototype into Server and Client Components? How did you decide where the boundary went?"

**Why they ask:** to check you understand the App Router model, not just the buzzwords.

- **Situation:** The ICHEC portal has public pages (services, documentation, news) that need to rank in search, plus signed-in interactive areas.
- **Task:** Build a Next.js prototype that was good for SEO without shipping a large client bundle.
- **Action:** Server Components fetched data and rendered the public content on the server, so crawlers and users got full HTML on the first response. I kept `"use client"` as low in the tree as I could: only the form, the filter bar and anything with state or event handlers. Server Components passed plain, serialisable props down to those islands.
- **Result:** Public pages arrived fully rendered and most of the page shipped no JavaScript. **[Add a number if you have one: bundle size or Lighthouse SEO/performance score.]** It was a prototype, not the production portal, and I'm clear about that.

**Follow-ups**

- *What can't a Server Component do?* No state, no effects, no event handlers, no browser APIs.
- *Can a Client Component import a Server Component?* Not directly. You pass the Server Component as `children` or a prop from a server parent.
- *SSR vs SSG vs ISR?* SSG builds at deploy time, ISR rebuilds a static page on a timer or on demand, SSR renders per request. Public docs suit SSG or ISR; user-specific pages need SSR or client rendering.
- *What does Suspense add?* Streaming: the shell renders first, and slow sections stream in when their data is ready.

## 12.4 SSO flow end to end

> "Describe the Keycloak SSO flow you implemented, end to end."

**Why they ask:** at an auth-focused company this is a core skill. They want precise steps and the security reasoning behind them.

- **Situation:** All three portals needed single sign-on for ICHEC staff and external researchers, with identities coming from LDAP through Keycloak.
- **Task:** Implement the frontend side securely and make sessions feel seamless.
- **Action:** I used the OpenID Connect Authorization Code flow with PKCE. The app redirects to Keycloak with a code challenge, Keycloak authenticates the user against LDAP, and redirects back with a short-lived code. The app exchanges that code, plus the verifier, for an access token, refresh token and ID token. **[Confirm where tokens were stored: e.g. in memory via keycloak-js, not localStorage.]** Before each API call, the client refreshes the access token if it expires within a few seconds, and an axios interceptor attaches it as a Bearer header. Roles come from the token's `realm_access` and `resource_access` claims. Logout clears local state and calls Keycloak's end-session endpoint, so the SSO session ends too.
- **Result:** One login across the portals, no passwords handled by our code, and roles in the UI that matched what the backend enforced.

**Follow-ups**

- *Why PKCE?* A browser app can't keep a client secret. PKCE proves the app that started the login is the one redeeming the code, so a stolen code is useless.
- *localStorage vs memory vs httpOnly cookie?* localStorage is readable by any script, so XSS can steal tokens. Memory is safer but lost on reload, so you rely on silent SSO. An httpOnly cookie through a backend-for-frontend (BFF) keeps tokens out of JavaScript entirely, at the cost of CSRF protection and a server hop. For a high-security product I'd choose the BFF.
- *What happens if the token expires during a long form?* The refresh token renews it silently. If the refresh token has also expired, save the draft, send the user to log in, and restore the draft afterwards.
- *Access token vs ID token?* The ID token tells the client who the user is. The access token is what the API checks. Never send the ID token to the API.

## 12.5 Frontend vs backend authorisation

> "Tell me about keeping frontend and backend authorisation in step."

**Why they ask:** a common senior mistake is treating UI gating as security.

- **Situation:** The portal had applicants, reviewers and administrators. Each saw different routes, pages and buttons.
- **Task:** Gate the UI by role without ever letting it drift from what the API allowed.
- **Action:** I treated the backend as the only source of truth: DRF permissions decided every request. The frontend read roles from the token and used them only for UX: a `<RequireRole>` route guard, a `useHasRole` hook for buttons, and navigation built from the same role map. I kept the role names in one shared constants file that matched the Keycloak roles, and agreed changes with the backend in the same merge request. If the API still returned 403, the UI showed a clear "no access" state rather than a broken page.
- **Result:** Users only saw actions they could perform, and there was no path where hiding a button was the only protection.

**Follow-ups**

- *How did you test it?* A role matrix: for each role, Playwright logs in and checks which routes and buttons appear, while backend tests check the 403s.
- *What if a role changes mid-session?* The UI updates on the next token refresh. The backend rejects anything the old token no longer permits in the meantime.

## 12.6 Debugging an auth bug

> "Tell me about an authentication bug you debugged."

**Why they ask:** debugging stories show depth better than any definition.

::: warning Use a real bug
The story below is a common Keycloak SPA bug, written as an example. Replace it with one you actually fixed, or adapt it only if it really happened.
:::

- **Situation:** **[Example]** Users on the review screen were sometimes logged out at random, usually after the page had been open a while.
- **Task:** Find the cause and stop the logouts.
- **Action:** In the network tab I saw several requests fail with 401 at the same moment, and each one triggered its own token refresh. Keycloak rotates refresh tokens, so the first refresh succeeded and the rest used a token that was now invalid, which ended the session. I changed the interceptor to share a single in-flight refresh promise: the first 401 starts the refresh, the others wait for it and then retry once. I also refreshed tokens proactively a few seconds before expiry.
- **Result:** **[Example]** The random logouts stopped. I added a test that fires parallel requests with an expired token.

**Follow-ups**

- *What is refresh token rotation for?* Each refresh issues a new refresh token and invalidates the old one, so a stolen refresh token stops working once it's used twice.
- *How else can this break?* Clock skew on `exp`, CORS on the token endpoint, or redirect loops when the redirect URI doesn't match Keycloak's settings exactly.

## 12.7 Dynamic, validated forms

> "How did you build the dynamic forms behind the application and review workflows?"

**Why they ask:** complex forms are hard to get right, and they appear in every product.

- **Situation:** Applications differed by service and applicant type, so fields, sections and rules changed depending on earlier answers.
- **Task:** Make the forms reliable for researchers, SMEs and administrators, and keep bad data out of the review queue.
- **Action:** **[Confirm the libraries: e.g. React Hook Form with a Zod or Yup schema.]** Each form was driven by a schema that defined fields, conditions and validation, so new application types were mostly configuration. Conditional fields appeared and validated only when their condition was met. Multi-step forms kept their state across steps and validated each step before moving on. Backend validation errors came back in a consistent shape that I mapped onto the matching fields. For accessibility, every input had a label, and errors were linked with `aria-describedby` and announced.
- **Result:** Fewer incomplete or invalid submissions, which is a large part of why administrator review time fell by 30%.

**Follow-ups**

- *Controlled vs uncontrolled inputs?* Uncontrolled inputs (React Hook Form's default) re-render less, which matters on large forms.
- *Why validate on both sides?* Client validation is for fast feedback. Server validation is the real check, because the client can be bypassed.

## 12.8 Shared component toolkit

> "Tell me about the reusable component toolkit. How did you get teams to use it?"

**Why they ask:** design-system work shows you can think about other developers as users.

- **Situation:** Each ICHEC project was building its own tables, filters and form fields, with small differences and repeated bugs.
- **Task:** Build a shared toolkit and get it adopted, not just published.
- **Action:** I built configurable components on Tailwind and AG Grid: a data table with typed column definitions, server-side pagination, sorting and filtering built in, plus form fields with validation and error states. I kept the API small: sensible defaults, composition through `children` and render props for the rare custom cases, rather than dozens of flags. I documented each component with usage examples and used it first in my own projects, so others saw it working in production.
- **Result:** Less duplicated UI code across projects and a consistent look. **[Add a figure if you have one: number of projects using it, lines removed.]**

**Follow-ups**

- *How do you stop a shared component growing too many props?* When a prop serves one caller, make the component composable instead and let that caller build the variant.
- *How do you handle breaking changes?* Semantic versioning, a changelog and a deprecation warning one release before removal.
- *Is this a design system?* It's the component layer of one. A full design system adds design tokens, documented patterns and a shared design source. **[Be ready to say how far yours went.]**

## 12.9 Performance on data-heavy screens

> "Tell me about a performance problem you fixed."

**Why they ask:** they want to see you measure before and after, not guess.

- **Situation:** **[Name the screen: e.g. the administrator applications grid.]** It loaded slowly and felt sluggish when filtering.
- **Task:** Make it fast without removing features.
- **Action:** I measured first: Lighthouse for load, the network tab for payload size, and the React Profiler for re-renders. The causes were loading every record up front, one large bundle, and components re-rendering on every filter change. I moved to server-side pagination, filtering and sorting through AG Grid's server-side model. I split the code by route with `React.lazy`, so admin-only screens didn't load for applicants. I memoised column definitions and row handlers, since AG Grid redraws when they change identity.
- **Result:** **[Before and after: e.g. initial payload X MB to Y KB, LCP X s to Y s.]** Filtering became responsive even as the dataset grew.

**Follow-ups**

- *What are the Core Web Vitals?* LCP (loading), INP (responsiveness) and CLS (visual stability).
- *When does `useMemo` hurt?* When the computation is cheap. You pay the memory and comparison cost for no gain. Profile first.
- *How do you keep it fast over time?* A Lighthouse or bundle-size check in CI.

## 12.10 API contract disagreement

> "Tell me about a time you and a backend team disagreed on an API's shape."

**Why they ask:** frontend seniors spend a lot of time at this boundary.

- **Situation:** **[Use a real case: e.g. an endpoint returned deeply nested data and a different error shape from the rest of the API.]**
- **Task:** Get a contract that worked for the UI without making the backend awkward.
- **Action:** Because I also build DRF and FastAPI endpoints, I could suggest concrete changes rather than just complain. I proposed a consistent error envelope with field-level messages, standard pagination fields, and a flat shape matching what the grid needed. We agreed it in the OpenAPI spec first, then generated types from it. On GraphQL projects, CodeGen produced typed hooks from the schema, so a contract change showed up as a compile error, not a runtime bug.
- **Result:** Fewer integration bugs and less mapping code in the frontend.

**Follow-ups**

- *REST or GraphQL?* GraphQL suits screens that combine many related resources and clients needing different shapes. REST is simpler to cache and secure, and enough for most CRUD.
- *How do you ship a breaking change?* Version the endpoint, or add the new field alongside the old one, migrate the frontend, then remove the old one.

## 12.11 Testing strategy and CI

> "How do you decide what to unit test, component test and E2E test?"

- **Situation:** Three portals, a small team, and releases that had to be safe.
- **Task:** Get confidence without a slow, flaky test suite.
- **Action:** Unit tests in Vitest for pure logic such as validation rules and role checks. Component tests with React Testing Library that test behaviour, the way a user would: find by role and label, not by class name. Playwright E2E tests for the critical journeys only: log in, submit an application, review and approve it. The GitLab CI pipeline runs lint and tests, builds the app, builds a Docker image and pushes it to our Harbor registry.
- **Result:** **[Example of a regression the tests caught before release.]**

**Follow-ups**

- *How do you deal with flaky E2E tests?* Wait on conditions rather than timeouts, give each test its own data, and quarantine a flaky test while fixing it rather than retrying forever.
- *How do you test Keycloak login in CI?* Run Keycloak in a container with a test realm, log in once and reuse the saved session across tests.
- *Cypress or Playwright?* Playwright today: multiple browsers, parallel by default, and better handling of tabs and redirects such as the SSO flow.

## 12.12 Production issue from monitoring

> "Tell me about a production issue you found and fixed."

- **Situation:** **[Real incident: what Grafana showed, e.g. an error-rate spike or slow responses after a release.]**
- **Task:** Find the cause quickly and limit the impact.
- **Action:** **[How you narrowed it down: logs, the release diff, reproducing it. What you fixed or rolled back.]**
- **Result:** **[Time to fix, and the check or alert you added so it can't happen again.]**

Keep this one short and real. The follow-up is usually "what did you change afterwards?", so have that ready.

## 12.13 Pushing a technical decision

> "Tell me about a technical decision you pushed for that others resisted."

- **Situation:** Every new ICHEC Django project was setting up Keycloak authentication and Celery and Redis background jobs from scratch, slightly differently each time.
- **Task:** I wanted a shared toolkit, but teams were wary of depending on someone else's library.
- **Action:** I listened to the objections first: fear of being blocked by another team's release cycle, and of a library that did too much. So I kept ichec-django-core small and focused on the repeated parts, documented it, versioned it, and moved one project onto it first as proof. I took feedback from that team before asking others to adopt it.
- **Result:** Three projects adopted it, and setting up a new project became about 80% less complex. The same thinking shaped the frontend toolkit.

## 12.14 Mentoring

> "Tell me about mentoring a junior developer."

- **Situation:** I mentored three junior developers in a Scrum team of eight. **[Pick one person and what they struggled with.]**
- **Task:** Help them work independently.
- **Action:** **[What you did: pairing with them driving, review comments that explain why, tickets that stretched them a step at a time, asking them to present a topic.]**
- **Result:** **[Where they ended up: owning a feature, one-round reviews, mentoring others.]**

## 12.15 Working without a spec

> "Tell me about building something without a clear specification."

- **Situation:** ICHEC had no easy way to match people's skills to project needs. Nobody had asked for a tool.
- **Task:** I proposed Skill Match myself, so I also had to define what it should be.
- **Action:** I spoke to the people who would use it to find the one problem worth solving first, built the smallest version that solved it, and showed it early to get feedback. I wrote down what was in and out of scope so it didn't sprawl. In a separate innovation sprint I prototyped internal LLM tools the same way: short loops, real users, honest about what worked.
- **Result:** **[Skill Match's status and usage.]**

## 12.16 Blocking a merge in review

> "Tell me about a code review where you blocked a merge."

- **Situation:** **[Real case: e.g. a change that showed an admin action based on a role check only in the UI, or stored a token in localStorage.]**
- **Task:** Stop the problem without discouraging the author.
- **Action:** I explained the risk in the comment, linked the reason, and suggested a fix. I offered to pair on it. Afterwards **[the rule, lint check or checklist item you added]**.
- **Result:** **[Outcome.]**

## 12.17 A mistake I made

> "Tell me about a time you got something wrong."

Choose a real technical mistake you can talk about calmly. Good candidates from your work:

- Putting server data in Redux, then fighting stale data and loading flags (and moving to a query library).
- Shipping a screen that failed keyboard or screen-reader checks, and what you changed in your process.
- Over-building a shared component before a second project needed it.

Structure: what happened, what you did straight away, what you changed so it doesn't happen again. End on the lesson.

## 12.18 Using AI tools safely

> "You list AI-assisted development. How do you make sure AI-written code is correct?"

- I treat it like code from a new team member: I read every line and own it.
- I use it most for boilerplate, tests and exploring an unfamiliar API, less for security-sensitive code such as auth.
- Tests and type checks are the safety net: if I can't write a test that proves it works, I don't merge it.
- I never paste secrets or private data into a tool.

## 12.19 Where the resume invites hard questions

| Claim | What they'll ask | Have ready |
| --- | --- | --- |
| 30% / 50% / 80% | "How did you measure that?" | Method and time period for each |
| "Design Systems" in the headline | Tokens, theming, docs, Storybook | What your toolkit includes and doesn't |
| Accessibility | "Give me an example." | One concrete fix: grid keyboard navigation, form error announcements, contrast |
| Next.js | "Was it in production?" | It was a prototype. Say so. |
| Cypress and Playwright | "Which do you prefer?" | Playwright, and why (12.11) |
| Frontend-focused full stack | "Are you frontend or backend?" | Frontend first; backend so the contract is right |

Practise each answer out loud in 60 to 90 seconds, with a number in the result whenever you can.
