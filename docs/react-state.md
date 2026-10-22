# 4. React state management

State is any value that can change while the app runs and that the screen depends on.

The best answer to "how do you manage state?" starts by splitting state into kinds, because each kind has a different best tool.

- **The problem:** Teams put everything in one global store, including API data, form fields and whether a dropdown is open. The store grows huge and every change is hard.
- **The fix:** Sort each value by kind, and give each kind its own tool. Once server data moves into a data-fetching library, most apps need very little global state.

## 4.1 The kinds of state

| Kind | Example | Best tool |
| --- | --- | --- |
| Local UI state | Is this dropdown open, input value | `useState`, `useReducer` |
| Shared UI state | Theme, current user, locale, sidebar open | Context, or Zustand |
| Server state (cached remote data) | Products, user profile, search results | TanStack Query, SWR, RTK Query, Apollo |
| Complex global client state | Multi-step editor, cart with rules, undo/redo | Redux Toolkit, Zustand |
| URL state | Filters, page number, selected tab | Router search params |
| Form state | Fields, errors, touched | React Hook Form + Zod |
| Derived state | Filtered list, totals | Compute during render (`useMemo` if expensive), never store |

### The rule: start local, move up only when you must

- **Local first:** Keep state in the component that uses it.
- **Lift when siblings need it:** Move it to their closest shared parent.
- **Global last:** Only when many distant components need it.

## 4.2 useState and useReducer

Both hooks hold local state. The difference is where the update logic lives.

- **`useState`:** Right for independent values, such as an open flag or an input's text. Each update happens wherever you call the setter.
- **The problem:** When the next state depends on several values, or there are many kinds of change, the update logic spreads across many handlers.
- **`useReducer`:** Moves all the update logic into one function. Handlers just name what happened, such as `{ type: 'add' }`. That one function is easy to read and to test.

```jsx
function reducer(state, action) {
  switch (action.type) {
    case 'add':    return { ...state, items: [...state.items, action.item] };
    case 'remove': return { ...state, items: state.items.filter(i => i.id !== action.id) };
    case 'clear':  return { ...state, items: [] };
    default: throw new Error(`Unknown action ${action.type}`);
  }
}
const [cart, dispatch] = useReducer(reducer, { items: [] });
dispatch({ type: 'add', item });
```

## 4.3 Context API

Context lets any component in a subtree read a value without passing it through every layer as props.

### The problem: prop drilling

- The logged-in user is needed by a header ten levels down.
- Without context, every component in between must accept `user` and pass it on, even though it never uses it.

### The fix: a provider at the top, a hook at the bottom

- A provider puts the value at the top of the tree.
- Any component below reads it with `useContext`, skipping the layers in between.

### The catch: it isn't a full state manager

- Context only delivers a value. It is a dependency injection tool, not a store.
- It has no selectors, so every component that reads it re-renders when any part of the value changes.

```jsx
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const value = useMemo(() => ({ user, login: setUser, logout: () => setUser(null) }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

- **Good for:** Values that change rarely, such as theme, auth, language and feature flags.
- **Keeping it fast:** Wrap the value in `useMemo`, split contexts by concern (state and dispatch in separate contexts), and keep fast-changing values out.

## 4.4 Redux and Redux Toolkit

Redux keeps the app's global state in one central store, and changes it only through one route.

### How it works: three parts

- **Dispatch an action:** A component sends a message saying what happened, such as `addItem(product)`.
- **A reducer computes the next state:** A pure function takes the old state and the action, and returns the new state.
- **Read with a selector:** A component picks out only the slice it needs, such as the item count, and re-renders only when that slice changes. This is what context lacks.

### Redux Toolkit (RTK)

RTK is the modern way to write Redux:

- **Less boilerplate:** `createSlice` writes the actions and reducer for you.
- **Immer:** You write code that looks like it changes state in place, and Immer turns it into a new, unchanged copy.
- **Built in:** Thunks for async logic, and RTK Query for data fetching.

```javascript
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem(state, action) { state.items.push(action.payload); }, // Immer makes this safe
    removeItem(state, action) { state.items = state.items.filter(i => i.id !== action.payload); },
  },
});
export const { addItem, removeItem } = cartSlice.actions;
const store = configureStore({ reducer: { cart: cartSlice.reducer } });

// In a component
const count = useSelector(state => state.cart.items.length);
const dispatch = useDispatch();
dispatch(addItem(product));
```

- **Strengths:** Every change takes the same path, so it is predictable. DevTools let you step back through every change (time travel). Middleware adds logging and async. It scales to large teams.
- **Costs:** More concepts and code than a small app needs.

## 4.5 Zustand, Jotai and others

These are lighter stores for when context re-renders too much but Redux is more than you need.

- **Zustand:** A tiny store you read with a hook. It has selectors like Redux, and needs no provider. A popular middle ground.
- **Jotai and Recoil:** State as many small, independent pieces called atoms. Each component subscribes only to the atoms it uses.
- **MobX:** You change objects directly, and MobX tracks what each component reads and re-renders it automatically.

```javascript
const useCart = create(set => ({
  items: [],
  add: item => set(s => ({ items: [...s.items, item] })),
}));
const count = useCart(s => s.items.length);
```

## 4.6 Server state with TanStack Query

TanStack Query (formerly React Query) manages **server state**: data that lives on a server and that the app fetches, caches and updates. It does not replace `useState` or Redux for client state.

Server data has its own problems: caching, deduplication, background refetch, stale data, retries, pagination, optimistic updates. TanStack Query solves them so you do not hand-roll them in `useEffect` or Redux.

### The problem it solves

```jsx
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetchUser(id).then(setUser).catch(setError).finally(() => setLoading(false));
}, [id]);
```

This code leaves a lot unsolved. Two components that need the same user fetch it twice. The data goes stale and nothing refetches it. A slow response for an old `id` can overwrite a newer one. Nothing retries a failed request. After a save, you update the data by hand.

### Queries and mutations

```jsx
const { data, isPending, error } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id),
  staleTime: 60_000,
});

const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user', id] }),
});
```

The `queryKey` identifies the data in the cache. When the key changes (a new `id`), the query fetches again. Invalidating a key marks it stale and refetches any query that is on screen.

Wrap the app once in a provider:

```jsx
const queryClient = new QueryClient();

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### What you get

| Feature | What it does |
|---|---|
| Caching and deduplication | Components that use the same key share one request and one cached result |
| Stale-while-revalidate | Cached data shows at once while a fresh copy loads in the background |
| Automatic refetch | Refetches on window focus, network reconnect and mount; each can be turned off |
| Built-in states | `isPending`, `isError`, `isFetching` and `data` with no manual flags |
| Retries | Retries a failed query 3 times by default, with exponential backoff |
| Invalidation | After a mutation, mark related keys stale so they refetch |
| Optimistic updates | Update the cache before the server confirms, and roll back on error |
| Pagination | `useInfiniteQuery` for infinite scroll; `placeholderData: keepPreviousData` keeps the old page visible while the next loads |
| Dependent queries | `enabled: !!userId` waits until the input exists |
| DevTools | Inspect the cache, see what is stale, trigger refetches |

### `staleTime` and `gcTime`

- `staleTime` (default 0): how long data counts as fresh. Fresh data is served from the cache with no refetch.
- `gcTime` (default 5 minutes): how long unused data stays in the cache after the last component using it unmounts. It was called `cacheTime` before v5.

### Optimistic update

```jsx
useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previous = queryClient.getQueryData(['todos']);
    queryClient.setQueryData(['todos'], (old) =>
      old.map((t) => (t.id === newTodo.id ? newTodo : t)),
    );
    return { previous };
  },
  onError: (_err, _newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previous);
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
});
```

### When you may not need it

You may not need it if you already use RTK Query, SWR or Apollo (for GraphQL), or if the framework loads the data for you, as Next.js server components and React Router loaders do. It still pairs well with SSR: prefetch on the server, then hydrate the cache on the client.

## 4.7 How to choose

1. Is it derived from other state? Compute it; do not store it.
2. Does it come from the server? Use TanStack Query, SWR or RTK Query.
3. Should it survive refresh or be shareable by link? Put it in the URL.
4. Is it used by one component or a small subtree? `useState` or `useReducer`, lifted as needed.
5. Is it read widely but changes rarely? Context.
6. Is it large, complex and changes often, across many screens? Redux Toolkit or Zustand.

## 4.8 Interview questions with model answers

1. **How do you manage state in a React app?** Split it by kind. Local state in `useState`, server data in TanStack Query, filters in the URL, forms in React Hook Form, derived values computed in render, and a store only for complex shared client state.
2. **Context vs Redux?** Context delivers a value. Redux is a state container with selectors, middleware and DevTools. Context re-renders every reader when the value changes.
3. **When would you not use Redux?** Small apps, or when most state is server data handled by a query library.
4. **What are the three principles of Redux?** Single source of truth, state is read-only (changed by actions), changes are made with pure reducers.
5. **What is middleware in Redux?** Code between dispatch and the reducer: logging, thunks for async, analytics.
6. **How does Redux Toolkit let you write mutating code?** Immer records changes on a draft and produces a new immutable state.
7. **How do you avoid unnecessary re-renders with context?** Memoise the value, split contexts, use selectors via a store library.
8. **What is server state and why treat it separately?** It is a local copy of data that lives on the server. It can go out of date, so it needs refetching, invalidation and deduplication, which client state doesn't.
9. **What is optimistic updating?** Update the UI immediately, then roll back if the request fails.
10. **What is lifting state up?** Moving state to the nearest common parent of the components that need it.
11. **Where do you keep filter and pagination state?** In the URL, so it is shareable and survives refresh.
12. **How would you persist state across reloads?** `localStorage` with a persist middleware, or the URL, or the server.
13. **What is TanStack Query and why use it?** It manages server state. It handles caching, deduplication, background refetching, retries and invalidation after mutations, so you do not write `useEffect` fetching code or keep API data in Redux.
14. **What is the difference between `staleTime` and `gcTime`?** `staleTime` is how long data counts as fresh before a refetch. `gcTime` is how long unused data stays in the cache before it is removed.

## 4.9 STAR example: replacing Redux boilerplate

- **Situation**: Our app stored every API response in Redux with hand-written loading, error and cache logic. Adding a screen took about 300 lines of slices and thunks, and stale data bugs were common.
- **Task**: I was asked to cut the cost of new screens and fix stale data.
- **Action**: I audited the store and found about 70% of it was server data. I proposed moving server data to TanStack Query and keeping Redux Toolkit only for true client state (the editor and the cart). I built a proof of concept on one screen, measured lines of code and bug count, presented it to the team, then migrated screen by screen behind the same component interfaces.
- **Result**: New screens needed roughly a third of the code. Stale data tickets dropped to near zero because queries refetch on focus and invalidate after mutations. The Redux store shrank to two slices that new joiners could understand in a day.
