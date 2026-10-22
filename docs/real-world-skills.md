# 10. Real-world skills team leads and hiring managers expect

Beyond syntax, a lead is asking one question: can I trust this person with a feature from ticket to production, and will they make the team better? Show that you think about users, failure modes, maintainability and other people.

## 10.1 Frontend system design

Frontend system design is planning a feature or app before writing code: its parts, its data, and how it stays fast and reliable.

### The problem: freezing on an open question

- Senior rounds often include a 45-minute question such as "design an autocomplete" or "design a news feed".
- With no structure, people jump into code, forget accessibility, or run out of time before the interesting part.

### The fix: the same five steps every time (RADIO)

1. **Requirements** (5 min): functional (what it does) and non-functional (devices, scale, offline, accessibility, internationalisation, performance targets). Ask questions; write the answers down.
2. **Architecture** (5 to 10 min): the main components and how they talk: UI components, state store, API layer, cache, server.
3. **Data model** (5 min): the shape of client state and entities; what is server state vs client state.
4. **Interface** (5 to 10 min): API contracts between client and server (REST or GraphQL, pagination style, error format) and component props.
5. **Optimisations and deep dives** (15 min): performance, accessibility, security, error handling, testing, monitoring. This is where seniority shows.

### Worked example: autocomplete (typeahead)

- Requirements: suggestions as the user types, keyboard navigation, mobile, fast, results for 10M items.
- Architecture: `Input` → debounced query → cache lookup → API → `ResultsList` in a popover.
- Data: `{ query, results, highlightedIndex, status }`; an in-memory cache keyed by query (LRU, limited size).
- Interface: `GET /search?q=term&limit=10`, response with `id`, `label`, `type`.
- Deep dives:
  - Debounce about 200 to 300 ms; cancel stale requests with `AbortController`; ignore out-of-order responses.
  - Cache previous queries; prefetch popular ones.
  - Accessibility: the WAI-ARIA combobox pattern, `aria-activedescendant`, arrow keys, Enter, Escape, announced result count.
  - Highlight matched text safely (no `innerHTML`).
  - Handle empty, loading, error and "no results" states.
  - Mobile: avoid the keyboard covering results; larger touch targets.

**Other common design questions**: news feed with infinite scroll, image carousel, chat app, collaborative editor, file uploader with progress and retry, data table with sort/filter/pagination, e-commerce checkout, notification system, a design system, a dashboard with real-time updates.

## 10.2 API integration and error handling

The happy path is easy. This section is about what happens when the network is slow, the server says no, or the user goes offline.

- **One typed API client:** Base URL, auth headers, token refresh, timeouts and error handling live in one place, not in every component.
- **Four states for every async screen:** Loading, empty, error and success. Design all four, because bugs hide in the last three.
- **Retries:** Retry safe requests with exponential backoff, waiting longer each time. For payments, send an idempotency key, so a retried request can't charge twice.
- **Status codes:**
  - **401:** Not logged in. Re-authenticate.
  - **403:** Logged in but not allowed. Show a permission message.
  - **429:** Too many requests. Back off.
  - **Offline:** Queue the action, or tell the user.

## 10.3 Testing strategy

- **Most features:** Integration tests with React Testing Library and MSW.
- **Pure logic:** Unit tests.
- **Critical journeys:** A handful of Playwright tests.
- **The design system:** Visual tests.
- **Enforcement:** Tests run in CI on every pull request and block the merge.

The [testing page](/testing) explains why.

## 10.4 Code quality and code review

- Clear names, small components, single responsibility, no premature abstraction.
- ESLint, Prettier, TypeScript strict, Husky pre-commit hooks.
- In review: check correctness, edge cases, accessibility, security, performance, tests, and readability. Be kind and specific; suggest, explain why, and approve when good enough rather than perfect.
- Write small pull requests with a clear description and screenshots.

## 10.5 Debugging production issues

1. **Reproduce:** Get the browser, steps, account and logs. Use session replay if available.
2. **Contain:** Roll back, or turn off the feature flag, if users are hurt. Stop the damage before you find the cause.
3. **Investigate:** Sentry stack traces with source maps, the network tab, React DevTools, and `git bisect` to find the change that broke it.
4. **Fix:** With a test that fails before the fix and passes after.
5. **Follow up:** A blameless postmortem, plus monitoring or a lint rule so it can't happen again.

## 10.6 CI/CD, tooling and delivery

- **Builds:** Vite or Next.js, with configuration from environment variables.
- **Preview deployments:** A live copy of each pull request (Vercel, Netlify), so reviewers can click through it.
- **Feature flags:** Ship code switched off, then turn it on gradually (LaunchDarkly, Unleash).
- **Trunk-based development:** Small branches merged into `main` often.
- **Semantic versioning:** `major.minor.patch`, where a major bump means a breaking change.
- **Docker:** The same environment everywhere.
- **Monitoring after release.**

The [CI/CD page](/cicd-deployment) covers this in depth.

## 10.7 Collaboration and ownership

- **With design**: question designs early about edge cases, responsive behaviour and accessibility; agree on tokens and components.
- **With backend**: agree API contracts before building; use mocks (MSW) to work in parallel.
- **With product**: break features into small shippable slices; flag trade-offs and estimates honestly.
- **Mentoring**: pair programming, clear review comments, writing docs and ADRs (architecture decision records).
- **Ownership**: you watch your feature in production after release, not just merge it.

## 10.8 Questions a lead might ask

1. How would you structure a new React project from scratch, and why?
2. Tell me how you would add a large feature to a codebase you do not know.
3. How do you decide between building a component and using a library?
4. A page is slow on low-end Android phones. Walk me through what you do.
5. How do you handle a disagreement about technical direction?
6. How do you balance tech debt against feature work?
7. How do you ensure accessibility is not an afterthought?
8. What would you do in your first 90 days here?
9. Tell me about a production incident you handled.
10. What is a technical decision you regret, and what did you learn?

## 10.9 Questions to ask the interviewer

- What does a typical feature's path from idea to production look like here?
- How is frontend architecture decided, and who owns the design system?
- How do you measure frontend performance and quality today?
- What is the biggest technical challenge the team faces in the next six months?
- What would make someone successful in this role in the first year?
