# 3. React core

React is a library for building UIs as a tree of components. You describe what the UI should look like for a given state, and React works out the minimum DOM changes. The core idea interviewers test: **UI = f(state)**, rendering must be pure, and side effects live outside rendering.

## 3.1 JSX and components

JSX is syntax that compiles to `React.createElement` (or the newer `jsx()` runtime) calls, which return plain objects describing elements. Components are functions that take props and return JSX.

```jsx
function Greeting({ name }) {
  return <h1>Hello, {name}</h1>;
}
```

Rules: one root element (or a Fragment `<>...</>`), `className` not `class`, `htmlFor` not `for`, camelCase events, `{}` for JS expressions.

Class components still exist in older codebases. Know their lifecycle mapping: `componentDidMount`/`componentDidUpdate`/`componentWillUnmount` map to `useEffect` with the right dependencies and a cleanup function.

## 3.2 Props vs state

|  | Props | State |
| --- | --- | --- |
| Owned by | The parent | The component itself |
| Mutable? | Read-only | Updated with a setter |
| Triggers re-render | When the parent passes new values | When set to a new value |
| Purpose | Configure a component | Remember things that change over time |

Data flows one way, parent to child. Children talk back by calling functions passed as props. **Lifting state up** means moving shared state to the closest common parent.

## 3.3 Rendering, reconciliation and keys

1. **Trigger**: initial mount, or a state update in this component or a parent (or a context it reads).
2. **Render phase**: React calls your components to build a new element tree. Must be pure; can be paused or repeated.
3. **Reconciliation**: React diffs the new tree against the previous one (the Fiber tree). Different element type means tear down and rebuild; same type means update props.
4. **Commit phase**: React applies DOM changes, then runs layout effects, then paints, then runs effects.

A parent re-render re-renders all its children by default, even if their props did not change. That is usually fine; optimise only when measured.

**Keys** tell React which list item is which between renders. Use a stable unique id. Using the array index breaks when items are inserted, removed or reordered: state and input values attach to the wrong row. Changing a key on purpose resets a component's state.

## 3.4 Hooks

Rules of Hooks: call them only at the top level of a component or custom hook, never inside conditions, loops or nested functions. React tracks hooks by call order.

| Hook | Use it for |
| --- | --- |
| `useState` | Local state |
| `useReducer` | Complex state with many transitions |
| `useEffect` | Syncing with external systems after paint (fetching, subscriptions, timers) |
| `useLayoutEffect` | Measuring DOM before paint (avoids flicker) |
| `useRef` | A mutable value that survives renders without re-rendering; DOM access |
| `useMemo` | Cache an expensive calculation |
| `useCallback` | Cache a function reference |
| `useContext` | Read a context value |
| `useId` | Stable unique ids for accessibility attributes |
| `useTransition` / `useDeferredValue` | Mark updates as non-urgent to keep typing responsive |
| `useSyncExternalStore` | Subscribe to an external store safely |
| `useOptimistic`, `useActionState`, `use` | React 19: optimistic UI, form actions, reading promises and context |

**State updates are asynchronous and batched.** Use the functional form when the new state depends on the old.

```jsx
setCount(count + 1); setCount(count + 1); // +1 only
setCount(c => c + 1); setCount(c => c + 1); // +2
```

Never mutate state. Create new objects and arrays: `setUser({ ...user, name })`, `setItems([...items, item])`, `items.filter(...)`.

## 3.5 useEffect done right

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then(r => r.json())
    .then(setUser)
    .catch(err => { if (err.name !== 'AbortError') setError(err); });
  return () => controller.abort(); // cleanup on id change or unmount
}, [id]);
```

- No dependency array: runs after every render.
- `[]`: runs once after mount (twice in development Strict Mode, to expose missing cleanup).
- `[a, b]`: runs when `a` or `b` change.

You often do **not** need an effect: derive values during render instead of syncing them into state, handle user events in event handlers, and use a data library (TanStack Query, SWR) for fetching. **Stale closures**: an effect or callback sees the props and state from the render it was created in; missing dependencies cause bugs.

## 3.6 Forms

- **Controlled**: React state holds the value (`value` + `onChange`). Easy validation, more re-renders.
- **Uncontrolled**: the DOM holds the value, read via `ref` or `FormData`. Fewer re-renders.
- In practice, large forms use **React Hook Form** (uncontrolled under the hood, fast) with **Zod** schemas for validation.

## 3.7 Composition patterns

- **Children and slots**: pass JSX as `children` or named props instead of deep configuration.
- **Custom hooks**: share stateful logic (`useDebounce`, `useFetch`, `useMediaQuery`). They share logic, not state.
- **Compound components**: `<Tabs><Tabs.List/><Tabs.Panel/></Tabs>` sharing state via context.
- **Higher-order components** and **render props**: older patterns, mostly replaced by hooks; know what they are.
- **Container vs presentational**: separate data fetching from display.

## 3.8 Interview questions with model answers

1. **What is the virtual DOM?** An in-memory tree of elements React compares between renders to compute minimal DOM updates. The benefit is a declarative model, not raw speed.
2. **What triggers a re-render?** State change, parent re-render, or a context value change.
3. **Why are keys important? Why not use the index?** See 3.3.
4. **Props vs state?** See 3.2.
5. **Controlled vs uncontrolled components?** See 3.6.
6. **Explain the `useEffect` dependency array and cleanup.** See 3.5.
7. **`useEffect` vs `useLayoutEffect`?** Layout effect runs synchronously after DOM mutation but before paint; use it only to measure or adjust layout.
8. **`useMemo` vs `useCallback`?** `useMemo` caches a value; `useCallback` caches a function. `useCallback(fn, deps)` equals `useMemo(() => fn, deps)`.
9. **Why is my state not updated right after `setState`?** Updates are scheduled and batched; the new value is available on the next render.
10. **What are the Rules of Hooks and why?** Hooks rely on call order to map to stored state.
11. **What is a custom hook?** A function starting with `use` that calls other hooks to reuse logic.
12. **What is prop drilling and how do you avoid it?** Passing props through layers that do not use them. Fix with composition, context or a store.
13. **What is Strict Mode?** A dev-only wrapper that double-invokes renders and effects to expose impure code and missing cleanup.
14. **What is a Fragment?** Groups children without adding a DOM node.
15. **How does React handle events?** Synthetic events, delegated at the root container.
16. **What is the difference between React and React DOM?** React is the component model; React DOM renders to the browser (React Native renders to mobile).
17. **What is `useRef` for besides DOM access?** Storing values like timer ids or previous values without causing re-renders.
18. **What is a stale closure in React?** See 3.5.

**Live coding to practise**: counter, todo list with add/delete/toggle, search with debounced API call, tabs, modal, accordion, star rating, infinite scroll, pagination, a form with validation, `useFetch` and `useDebounce` hooks.

## 3.9 STAR example: an infinite render loop

- **Situation**: After a release, a settings page froze and our API showed thousands of requests per minute from a few users.
- **Task**: I was on call and needed to stop the traffic and fix the root cause.
- **Action**: I rolled back first to stop the damage. In the code, a `useEffect` fetched data and depended on a `filters` object created inline on every render, so the effect ran, set state, re-rendered, created a new object, and ran again. I moved the object into `useMemo` keyed on its primitive values and switched the fetch to TanStack Query, which deduplicates requests. I enabled the `react-hooks/exhaustive-deps` lint rule as an error and added a test asserting one request per filter change.
- **Result**: Fixed and re-released the same day. The lint rule caught two similar bugs in other screens during the next month.
