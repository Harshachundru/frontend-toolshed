# 15. Testing frontend applications

This page explains how a frontend team tests a React and TypeScript app, from a single function up to a full user journey in a real browser. It goes deeper than the summary in [5.6](/react-advanced#_5-6-testing). Testing server state with TanStack Query and tRPC is in [13.7](/fintech-fullstack-ts#_13-7-testing-trpc-and-tanstack-query). Where these tests run in the pipeline is in [16. CI/CD](/cicd-deployment).

Interviewers want to hear three things: which kinds of test you write, why you split them that way, and how you keep them fast and reliable.

## 15.1 What tests are for

Tests let you change code without fear.

### What a good test does

- It fails when behaviour breaks.
- It passes when you refactor and nothing visible changed.

### The problem: tests that break on every refactor

- A test that checks internal details fails every time you tidy the code.
- The team learns to update it without reading it, so it stops catching anything.

### The fix: test behaviour, not implementation

- **Behaviour:** What a user or a caller sees. Text on screen, a request sent, a value returned.
- **Implementation:** How the code gets there. State variable names, which hook you used, how many times a component rendered.

## 15.2 The testing pyramid and the testing trophy

Both are pictures of how many tests to write at each level.

### The testing pyramid

Mike Cohn's pyramid says: many fast unit tests at the bottom, fewer integration tests in the middle, and very few slow end-to-end tests at the top.

- **Higher up:** Each test gives more confidence, because more real parts run.
- **The cost:** Higher tests are slower, break more easily and are harder to debug.

### The testing trophy

Kent C. Dodds adapted the pyramid for frontend.

- **The problem with the pyramid on the frontend:** Most frontend bugs come from parts working together, such as a form, its validation and the API call. A unit test of one small component catches few of them.
- **The fix:** Make integration tests the biggest layer, and add static analysis as the base.

Switch between the two shapes below to compare them:

<TestingShapes />

### What both agree on

- Catch each bug at the cheapest layer that can catch it.
- Keep E2E for the journeys where only a real browser and a real backend prove it works.

**In an interview:** "I follow the testing trophy. TypeScript and lint catch a whole class of bugs for free. Pure logic gets unit tests. Most of my tests render a screen with React Testing Library and mock the network with MSW, because that is where frontend bugs live. A handful of Playwright tests cover login, the main journey and its error path."

## 15.3 Tools

| Need | Tools | Notes |
| --- | --- | --- |
| Test runner | **Vitest**, Jest | Vitest shares Vite's config and is faster in Vite projects. The APIs are almost identical. |
| DOM for component tests | jsdom, happy-dom | A simulated DOM in Node. It has no layout, so sizes and positions are always 0. |
| Real browser for component tests | Vitest browser mode, Playwright component testing | Use when you need real layout, focus or CSS. |
| Render and query components | **React Testing Library** (RTL), `@testing-library/user-event` | Query like a user, by role and label. |
| Mock the network | **MSW** (Mock Service Worker) | Intercepts `fetch` at the network level, so your real API client runs. |
| End-to-end | **Playwright**, Cypress | Playwright runs Chromium, Firefox and WebKit, in parallel, and records traces. |
| Accessibility checks | `jest-axe` / `vitest-axe`, `@axe-core/playwright` | Finds missing labels, bad contrast and invalid ARIA. Covers about a third of issues. Keyboard and screen-reader checks are still manual. |
| Visual regression | Storybook with Chromatic, Playwright `toHaveScreenshot()` | Compares screenshots against an approved baseline. |
| API contracts | Pact, OpenAPI schema checks, Zod | Proves frontend and backend agree on the shape of the data. |
| Performance budgets | Lighthouse CI, `size-limit` | Fails the build if a bundle or a metric goes over budget. |
| Test quality | Coverage (`v8`, `istanbul`), Stryker (mutation testing) | Coverage shows what ran. Mutation testing shows whether a test would notice a bug. |

## 15.4 Unit tests

A unit test checks one function on its own, with no page, network or timers. It runs in milliseconds.

**What to unit-test:** Anything with rules, such as formatting, parsing, validation, permissions, reducers and custom hooks with logic.

```ts
// formatMoney.test.ts
import { describe, it, expect } from 'vitest'
import { formatMoney } from './formatMoney'

describe('formatMoney', () => {
  it('formats minor units in the given currency', () => {
    expect(formatMoney(123456, 'EUR', 'en-IE')).toBe('€1,234.56')
  })

  it('keeps the sign for refunds', () => {
    expect(formatMoney(-500, 'EUR', 'en-IE')).toBe('-€5.00')
  })

  it('handles currencies without minor units', () => {
    expect(formatMoney(1000, 'JPY', 'ja-JP')).toBe('￥1,000')
  })
})
```

Use a table of cases with `it.each` when the same rule has many inputs. Control time with `vi.useFakeTimers()` and `vi.setSystemTime()`, so tests never depend on today's date.

Logic is only easy to unit-test if it lives outside components. This is the practical benefit of the clean-architecture idea in [architecture patterns](/architecture-patterns): keep business rules in plain TypeScript functions.

## 15.5 Component and integration tests

In frontend testing, an integration test renders a real screen and uses it like a person would.

- **Real:** The screen's child components, state and API client.
- **Fake:** Only the network.
- **The test acts like a user:** It types, clicks and reads what appears.

```tsx
// TransferForm.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { TransferForm } from './TransferForm'

it('submits a transfer and shows the confirmation', async () => {
  const user = userEvent.setup()
  render(<TransferForm />)

  await user.type(screen.getByLabelText(/amount/i), '50')
  await user.click(screen.getByRole('button', { name: /send/i }))

  expect(await screen.findByText(/transfer sent/i)).toBeInTheDocument()
})

it('shows the server error when the transfer is rejected', async () => {
  server.use(
    http.post('/api/transfers', () =>
      HttpResponse.json({ message: 'Insufficient funds' }, { status: 422 }),
    ),
  )
  const user = userEvent.setup()
  render(<TransferForm />)

  await user.type(screen.getByLabelText(/amount/i), '5000')
  await user.click(screen.getByRole('button', { name: /send/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient funds')
})
```

The MSW server is set up once for the whole suite:

```ts
// test/setup.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

`onUnhandledRequest: 'error'` makes a test fail if the code calls an endpoint you forgot to mock, instead of hanging.

### Rules that keep component tests useful

- **Query by what the user perceives.** Prefer `getByRole`, then `getByLabelText`, then `getByText`. Use `getByTestId` only when nothing else works. Role queries also check accessibility for free: if you can't find the button by its name, a screen reader user can't either.
- **Use `userEvent`, not `fireEvent`.** `userEvent` types key by key and fires focus, keydown and input events in order, as a browser does.
- **Wait with `findBy` and `waitFor`, never with fixed sleeps.** `findBy` retries until the element appears or a timeout passes.
- **Mock at the network boundary.** Don't mock your own child components, hooks or API client. Each mock is a place where the test and production can differ.
- **Test the four states.** Loading, empty, error and success. Most production bugs are in the error and empty states, because the happy path is the one everyone clicks.
- **Wrap providers once.** Write a `renderWithProviders` helper that adds the router, a fresh `QueryClient` with retries off, the theme and i18n.
- **Avoid large snapshot tests.** A snapshot of a whole component fails on every markup change, so people update it without reading it. Small, targeted inline snapshots are fine.

## 15.6 Contract tests

A contract test checks that the frontend and backend still agree on the shape of the data.

### The problem

- Component tests fake the API, so they keep passing even if the backend renames a field.
- Production then breaks while every test is green.

### The fixes

- **Shared types.** In a TypeScript monorepo, tRPC or a shared Zod schema makes a mismatch a compile error.
- **Generated types.** Generate types from the backend's OpenAPI spec with `openapi-typescript`, and fail CI if the generated file changes without a commit.
- **Consumer-driven contracts.** With Pact, the frontend records the requests it makes and the responses it expects. The backend pipeline replays them against the real service. Use this when separate teams own each side.
- **Runtime validation.** Parse responses with Zod at the edge, so a broken contract fails loudly in one place, not as `undefined` deep in the UI.

## 15.7 End-to-end tests

An end-to-end (E2E) test drives a real browser through the real app, with a real backend behind it.

- **What it proves:** Routing, login, the API, the database and the build all work together.
- **What only it catches:** A wrong environment variable or a missing CORS header.

```ts
// e2e/transfer.spec.ts
import { test, expect } from '@playwright/test'

test('a signed-in user can send a transfer', async ({ page }) => {
  await page.goto('/transfers/new')
  await page.getByLabel('Amount').fill('25')
  await page.getByLabel('Recipient').fill('alice@example.com')
  await page.getByRole('button', { name: 'Send' }).click()

  await expect(page.getByRole('status')).toHaveText(/transfer sent/i)
})
```

### How E2E suites are set up

| Concern | Common practice |
| --- | --- |
| What to cover | 5 to 20 critical journeys: sign in, the main money path, and one failure path each. Edge cases belong in lower layers. |
| Logging in | Log in once in a setup project, save `storageState` to a file, and reuse it. Logging in through the UI in every test is slow. |
| Test data | Each test creates its own data through an API or a seed script, with unique names. Tests that share data fail when run in parallel. |
| Where it runs | Against a preview or staging environment after deploy, or against the built app plus backend containers started in the CI job. |
| Speed | Run tests in parallel and shard across CI jobs with `--shard=1/4`. |
| Debugging | `trace: 'on-first-retry'` records a trace with DOM snapshots, network and console. Open it with `npx playwright show-trace`. |
| Structure | Page objects or Playwright fixtures for repeated steps, so a UI change is fixed in one place. |

### Flaky tests

A flaky test passes and fails on the same code, with nothing changed. It is the main reason teams stop trusting E2E suites. The usual causes and fixes:

| Cause | Fix |
| --- | --- |
| Fixed waits such as `waitForTimeout(2000)` | Use web-first assertions like `expect(locator).toBeVisible()`, which retry automatically |
| Tests sharing data or order | Make each test create and clean up its own data |
| Animations and transitions | Disable them in the test environment, or assert on the end state |
| Third-party services (payments, maps, analytics) | Stub them with `page.route()` or use their sandbox |
| Time and time zones | Fix the clock with `page.clock` and set `timezoneId` in config |

Retries hide flakiness. Allow one retry in CI to keep the pipeline moving, but track tests that needed a retry and fix or quarantine them.

## 15.8 Visual, accessibility and performance tests

- **Visual regression** compares screenshots with an approved baseline. Use it for the design system and key pages, where a CSS change can break many screens. Run it in a fixed Docker image, because fonts render differently on each OS.
- **Accessibility** checks run axe inside component tests and E2E tests. They catch missing labels and contrast problems. Keyboard navigation and screen-reader output still need a person. See [6. HTML and accessibility](/html-accessibility).
- **Performance budgets** fail the build when the bundle grows past a limit or Lighthouse scores drop. See [9. Performance](/performance).

## 15.9 Coverage

Coverage is the percentage of your code's lines that ran during the tests.

### The problem: ran isn't the same as checked

- Coverage measures which lines ran, not whether any test checked the result.
- A test with no assertion still raises coverage.

### How to use it well

- **To find gaps:** Use it to spot untested files, not as a target.
- **A floor:** A minimum such as 70 to 80% stops coverage from falling.
- **Per change:** A diff-coverage check on each MR is more useful than one global number.
- **Mutation testing:** Stryker makes small changes to your code, such as flipping `>` to `>=`, and reports which changes no test noticed. That measures whether your tests really check anything.

## 15.10 Gaps people often have

| Belief | What is more accurate |
| --- | --- |
| "Unit test" means one test per component | In frontend, testing a component on its own with everything mocked catches little. Test a screen with its real children and fake the network. |
| The pyramid is about the number of tests | It is about cost and confidence. Catch each bug at the cheapest layer that can catch it. |
| E2E tests should cover every case | E2E tests are slow and flaky. Cover the main journeys. Test validation rules and error messages in component tests. |
| jsdom is a browser | jsdom has no layout, scrolling, real CSS or `IntersectionObserver`. Use browser mode or Playwright for code that depends on them. |
| Mock `fetch` or the API client with `vi.mock` | That skips your real request code. MSW intercepts at the network level, and the same handlers work in Storybook and the dev server. |
| 100% coverage means the code is tested | Coverage shows execution, not checking. |
| Tests are done when the happy path passes | Most incidents are in error, empty, slow-network and permission-denied states. |
| Tests run on my machine | Tests count when they run in CI on every MR and block the merge. See [16.3](/cicd-deployment#_16-3-the-gitlab-pipeline). |

## 15.11 Interview questions

**1. Walk me through your testing strategy for a new feature.**
Types and lint first. Unit tests for any rule with branches, such as validation or fee calculation. Component tests for the screen with RTL and MSW, covering success, validation errors, server errors and the empty state. One Playwright test if the feature is on a critical journey. All of it runs in CI and blocks the merge.

**2. What is the difference between the testing pyramid and the testing trophy?**
The pyramid puts most tests at the unit level. The trophy adds static analysis as a base and puts most tests at the integration level, because in UI code most bugs happen where parts meet.

**3. How do you deal with flaky E2E tests?**
Find the cause from the trace: usually a fixed wait, shared data or a third-party call. Replace waits with retrying assertions, give each test its own data, and stub third parties. Quarantine a test you can't fix the same day, and track it, so it does not block everyone.

**4. What do you mock, and what don't you?**
I mock the network, time and third-party services at the edge. I don't mock my own components, hooks or API client, because then the test checks the mock instead of the code.

**5. How do you know your mocks match the real API?**
Types generated from the OpenAPI spec or shared through tRPC, Zod validation at runtime, and Pact contracts when another team owns the API. E2E tests against staging are the final check.

**6. Your test suite takes 25 minutes. What do you do?**
Measure which jobs are slow. Run lint, types and unit tests in parallel. Shard E2E tests. Run only affected tests with Turborepo or Nx on MRs, and the full suite on `main`. Move edge cases down from E2E into component tests. Cache dependencies.
