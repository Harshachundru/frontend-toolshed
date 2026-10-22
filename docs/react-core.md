# 3. React core

React is a library for building a UI out of small pieces called components.

The one idea interviewers test is **UI = f(state)**:

- **You describe the screen:** For a given state, a component returns what the screen should look like.
- **React does the updating:** When state changes, React works out the smallest set of page changes and applies them.
- **Rendering must be pure:** A component only calculates what to show. Side effects, such as fetching or timers, live outside rendering.

## 3.1 JSX and components

A component is a function that takes inputs (props) and returns JSX, a description of what to show.

```jsx
function Greeting({ name }) {
  return <h1>Hello, {name}</h1>;
}
```

### What JSX really is

- JSX looks like HTML, but the build turns it into function calls, `jsx()` or the older `React.createElement`.
- Those calls return plain objects that describe elements. React reads the objects and updates the page.

### The rules that trip people up

- **One root:** Return one element, or wrap several in a Fragment `<>...</>`.
- **Renamed attributes:** `className` not `class`, `htmlFor` not `for`, because `class` and `for` are JavaScript words.
- **camelCase events:** `onClick`, not `onclick`.
- **Curly braces:** `{}` holds any JavaScript expression.

### Class components

Older codebases still use them. Know how their lifecycle maps to hooks: `componentDidMount`, `componentDidUpdate` and `componentWillUnmount` all become one `useEffect` with the right dependencies and a cleanup function.

## 3.2 Props vs state

Props are what a parent gives a component. State is what a component remembers for itself.

|  | Props | State |
| --- | --- | --- |
| Owned by | The parent | The component itself |
| Can it change? | No, read-only | Yes, through its setter |
| Triggers a re-render | When the parent passes new values | When set to a new value |
| Purpose | Configure a component | Remember things that change over time |

### How data moves

- **One way, down:** Data flows from parent to child.
- **Back up through functions:** A child talks to its parent by calling a function the parent passed as a prop, such as `onSave`.
- **Lifting state up:** When two siblings need the same state, move it to their closest shared parent and pass it down to both.

## 3.3 Rendering, reconciliation and keys

Rendering is React calling your components to find out what the screen should look like now.

### The four steps

1. **Trigger:** The first mount, or a state update in this component, a parent, or a context it reads.
2. **Render:** React calls your components to build a new tree of elements. This must be pure, because React may pause it or run it twice.
3. **Reconcile:** React compares the new tree with the previous one. A different element type means tear down and rebuild. The same type means just update the props.
4. **Commit:** React applies the changes to the page, runs layout effects, lets the browser paint, then runs normal effects.

### Children re-render too

- When a parent re-renders, all its children re-render by default, even if their props didn't change.
- That is usually fine. Optimise only when you have measured a slow screen.

### Keys: name tags for list items

- **The problem:** In a list, React needs to know which item is which between renders.
- **The fix:** Give each item a stable, unique `key`, such as its database id.
- **Why not the array index:** When you insert, remove or reorder items, the indexes shift. React then attaches state and typed input to the wrong row.
- **A trick:** Changing a component's key on purpose throws away its state and starts it fresh.

## 3.4 Hooks

Hooks are functions starting with `use` that let a component remember state and connect to things outside it.

### The Rules of Hooks

- Call hooks only at the top level of a component or custom hook.
- Never call them inside conditions, loops or nested functions.
- **Why:** React doesn't know hooks by name. It knows them by the order they are called, so the order must be the same on every render.

| Hook | Use it for |
| --- | --- |
| `useState` | Local state |
| `useReducer` | Complex state with many kinds of change |
| `useEffect` | Syncing with outside systems after paint: fetching, subscriptions, timers |
| `useLayoutEffect` | Measuring the page before paint, to avoid a flicker |
| `useRef` | A value that survives renders without causing one; DOM access |
| `useMemo` | Cache an expensive calculation |
| `useCallback` | Cache a function, so it stays the same object between renders |
| `useContext` | Read a context value |
| `useId` | Stable unique ids for accessibility attributes |
| `useTransition`, `useDeferredValue` | Mark updates as non-urgent, so typing stays responsive |
| `useSyncExternalStore` | Subscribe safely to a store outside React |
| `useOptimistic`, `useActionState`, `use` | React 19: optimistic UI, form actions, reading promises and context |

### State updates are scheduled, not instant

- **The problem:** `setCount` doesn't change `count` straight away. React batches updates and applies them on the next render.
- **The fix:** When the new value depends on the old one, pass a function. React gives it the latest value.

```jsx
setCount(count + 1); setCount(count + 1); // +1 only: both read the same old count
setCount(c => c + 1); setCount(c => c + 1); // +2: each gets the latest value
```

### Never change state in place

React spots changes by checking whether the object is a new one. Editing the old object in place looks like no change. Make new objects and arrays instead: `setUser({ ...user, name })`, `setItems([...items, item])`, `items.filter(...)`.

## 3.5 useEffect done right

An effect is code that runs after React paints, to keep your component in sync with something outside React.

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

### The dependency array decides when it runs

- **No array:** After every render.
- **`[]`:** Once after mount. In development Strict Mode it runs twice, to expose a missing cleanup.
- **`[a, b]`:** Whenever `a` or `b` changes.

### Cleanup

- The function you return runs before the effect runs again, and when the component leaves the page.
- Use it to cancel fetches, clear timers and unsubscribe.

### You often don't need an effect

- **A value you can calculate:** Work it out during render instead of copying it into state.
- **A reaction to a click:** Put it in the event handler.
- **Fetching data:** Use a data library such as TanStack Query or SWR.

### Stale closures

- **The problem:** An effect or callback remembers the props and state from the render that created it. If a value is missing from the dependency array, the code keeps using an old copy.
- **The fix:** List every value the effect uses, and turn on the `react-hooks/exhaustive-deps` lint rule.

## 3.6 Forms

The choice is who holds the input's value: React or the browser.

- **Controlled:** React state holds the value, through `value` and `onChange`. Validation is easy, but every keystroke re-renders.
- **Uncontrolled:** The browser holds the value, and you read it with a `ref` or `FormData` on submit. Fewer re-renders.
- **In practice:** Large forms use React Hook Form, which is uncontrolled underneath and fast, with Zod schemas for validation.

## 3.7 Composition patterns

Composition means building big components by plugging small ones together, instead of adding ever more config options.

- **Children and slots:** Pass JSX as `children` or as named props, such as `header={<Title />}`.
- **Custom hooks:** Share stateful logic, such as `useDebounce`, `useFetch` or `useMediaQuery`. Each component that calls the hook gets its own copy of the state. They share logic, not state.
- **Compound components:** `<Tabs><Tabs.List/><Tabs.Panel/></Tabs>`, where the parts share state through context.
- **Higher-order components and render props:** Older patterns, mostly replaced by hooks. Know what they are.
- **Container and presentational:** One component fetches data, another only displays it.

## 3.8 Interview questions with model answers

1. **What is the virtual DOM?** An in-memory tree of elements that React compares between renders to work out the smallest page changes. The benefit is that you describe the screen instead of editing it by hand. It isn't about raw speed.
2. **What triggers a re-render?** A state change, a parent re-rendering, or a change to a context value the component reads.
3. **Why are keys important? Why not use the index?** Keys tell React which list item is which. Indexes shift when items are inserted, removed or reordered, so state attaches to the wrong row.
4. **Props vs state?** Props come from the parent and are read-only. State belongs to the component and changes through its setter.
5. **Controlled vs uncontrolled components?** Controlled means React state holds the value. Uncontrolled means the browser holds it and you read it when you need it.
6. **Explain the `useEffect` dependency array and cleanup.** The array lists the values that should re-run the effect. The cleanup runs before the next run and on unmount, to cancel what the effect started.
7. **`useEffect` vs `useLayoutEffect`?** A layout effect runs after the page is changed but before the browser paints. Use it only to measure or adjust layout, to avoid a flicker.
8. **`useMemo` vs `useCallback`?** `useMemo` caches a value. `useCallback` caches a function. `useCallback(fn, deps)` is the same as `useMemo(() => fn, deps)`.
9. **Why is my state not updated right after `setState`?** Updates are scheduled and batched. The new value appears on the next render.
10. **What are the Rules of Hooks and why?** Only call hooks at the top level. React matches hooks to their stored state by call order, so the order must never change.
11. **What is a custom hook?** A function whose name starts with `use` and that calls other hooks, so components can reuse logic.
12. **What is prop drilling and how do you avoid it?** Passing props through layers that don't use them. Fix it with composition, context or a store.
13. **What is Strict Mode?** A development-only wrapper that runs renders and effects twice, to expose impure code and missing cleanup.
14. **What is a Fragment?** It groups children without adding an extra element to the page.
15. **How does React handle events?** It wraps browser events in synthetic events and listens once at the root, not on every element.
16. **What is the difference between React and React DOM?** React is the component model. React DOM draws components in the browser, and React Native draws them on mobile.
17. **What is `useRef` for besides DOM access?** Storing values such as timer ids or the previous value, without causing a re-render.
18. **What is a stale closure in React?** A callback or effect that still uses props or state from an old render, usually because of a missing dependency.

**Live coding to practise:** counter, todo list with add, delete and toggle, search with a debounced API call, tabs, modal, accordion, star rating, infinite scroll, pagination, a form with validation, and `useFetch` and `useDebounce` hooks.

## 3.9 STAR example: an infinite render loop

- **Situation:** After a release, a settings page froze and our API showed thousands of requests per minute from a few users.
- **Task:** I was on call and needed to stop the traffic and fix the root cause.
- **Action:** I rolled back first to stop the damage. In the code, a `useEffect` fetched data and depended on a `filters` object created inline on every render. The effect ran, set state, re-rendered, created a new object, and ran again. I moved the object into `useMemo` keyed on its primitive values and switched the fetch to TanStack Query, which removes duplicate requests. I made the `react-hooks/exhaustive-deps` lint rule an error and added a test asserting one request per filter change.
- **Result:** Fixed and re-released the same day. The lint rule caught two similar bugs in other screens during the next month.
