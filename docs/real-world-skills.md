# 10. Real-world skills team leads and hiring managers expect

Beyond syntax, a lead is asking one question: can I trust this person with a feature from ticket to production, and will they make the team better? Show that you think about users, failure modes, maintainability and other people.

## 10.1 Frontend system design

Senior rounds often include a 45-minute design question such as "design an autocomplete" or "design a news feed". Use a fixed framework so you never freeze. A good acronym is **RADIO**:

1. **Requirements** (5 min): functional (what it does) and non-functional (devices, scale, offline, accessibility, internationalisation, performance targets). Ask questions; write the answers down.
2. **Architecture** (5 to 10 min): the main components and how they talk: UI components, state store, API layer, cache, server.
3. **Data model** (5 min): the shape of client state and entities; what is server state vs client state.
4. **Interface** (5 to 10 min): API contracts between client and server (REST or GraphQL, pagination style, error format) and component props.
5. **Optimisations and deep dives** (15 min): performance, accessibility, security, error handling, testing, monitoring. This is where seniority shows.

**Worked example: autocomplete (typeahead)**

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

- A typed API client in one place with base URL, auth headers, token refresh, timeouts and error normalisation.
- Every async UI has four states: loading, empty, error, success. Design all four.
- Retries with exponential backoff for safe requests; idempotency keys for payments.
- Handle 401 (re-authenticate), 403 (show a permission message), 429 (back off), offline (queue or tell the user).

## 10.3 Testing strategy

Explain the trade-off you would choose: integration tests with React Testing Library and MSW for most features, unit tests for pure logic, a handful of Playwright tests for critical journeys, and visual tests for the design system. Tests run in CI on every pull request and block merges.

## 10.4 Code quality and code review

- Clear names, small components, single responsibility, no premature abstraction.
- ESLint, Prettier, TypeScript strict, Husky pre-commit hooks.
- In review: check correctness, edge cases, accessibility, security, performance, tests, and readability. Be kind and specific; suggest, explain why, and approve when good enough rather than perfect.
- Write small pull requests with a clear description and screenshots.

## 10.5 Debugging production issues

1. Reproduce: get the browser, steps, account and logs. Use session replay if available.
2. Contain: roll back or turn off the feature flag if users are hurt.
3. Investigate: Sentry stack traces with source maps, network tab, React DevTools, `git bisect` to find the change.
4. Fix with a test that fails before the fix.
5. Follow up: a blameless postmortem, monitoring or lint rules so it cannot recur.

## 10.6 CI/CD, tooling and delivery

Vite or Next.js builds, environment variables, preview deployments per pull request (Vercel, Netlify), feature flags (LaunchDarkly, Unleash) for safe rollout, trunk-based development, semantic versioning, Docker for consistent environments, and monitoring after release.

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
