# 4. React state management

The best answer to "how do you manage state?" starts by splitting state into kinds, because each kind has a different best tool. Most apps need far less global state than people think once server data moves into a data-fetching library.

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

Rule: keep state as local as possible, lift it only when siblings need it, and go global only when many distant components need it.

## 4.2 useState and useReducer

`useState` is right for independent values. Switch to `useReducer` when the next state depends on several values, or there are many named transitions, so logic is centralised and testable.

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

Context passes a value through the tree without prop drilling. It is a **dependency injection** tool, not a full state manager: it has no selectors, so every consumer re-renders when the value changes.

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

Good for: theme, auth, locale, feature flags, low-frequency values. Performance tips: memoise the value, split contexts by concern (state and dispatch in separate contexts), keep fast-changing values out of context.

## 4.4 Redux and Redux Toolkit

Redux keeps global state in one store. Components **dispatch actions**; pure **reducers** compute the next state; components read with **selectors** and re-render only when their selected slice changes. Redux Toolkit (RTK) is the modern standard: less boilerplate, Immer for "mutating" syntax that stays immutable, built-in thunks, and RTK Query for data fetching.

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

Strengths: predictable data flow, DevTools with time-travel debugging, middleware, scales to large teams. Costs: more concepts and code than needed for small apps.

## 4.5 Zustand, Jotai and others

- **Zustand**: a tiny hook-based store with selectors and no provider. Popular middle ground.
- **Jotai / Recoil**: atomic state, good for many small independent pieces.
- **MobX**: observable, mutable style with automatic tracking.

```javascript
const useCart = create(set => ({
  items: [],
  add: item => set(s => ({ items: [...s.items, item] })),
}));
const count = useCart(s => s.items.length);
```

## 4.6 Server state with TanStack Query

Server data has its own problems: caching, deduplication, background refetch, stale data, retries, pagination, optimistic updates. TanStack Query solves them so you do not hand-roll them in Redux.

```jsx
const { data, isLoading, error } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id),
  staleTime: 60_000,
});

const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user', id] }),
});
```

## 4.7 How to choose

1. Is it derived from other state? Compute it; do not store it.
2. Does it come from the server? Use TanStack Query, SWR or RTK Query.
3. Should it survive refresh or be shareable by link? Put it in the URL.
4. Is it used by one component or a small subtree? `useState` or `useReducer`, lifted as needed.
5. Is it read widely but changes rarely? Context.
6. Is it large, complex and changes often, across many screens? Redux Toolkit or Zustand.

## 4.8 Interview questions with model answers

1. **How do you manage state in a React app?** Walk through the table in 4.1 and the decision list in 4.7.
2. **Context vs Redux?** Context transports a value; Redux is a state container with selectors, middleware and DevTools. Context re-renders all consumers on change.
3. **When would you not use Redux?** Small apps, or when most state is server data handled by a query library.
4. **What are the three principles of Redux?** Single source of truth, state is read-only (changed by actions), changes are made with pure reducers.
5. **What is middleware in Redux?** Code between dispatch and the reducer: logging, thunks for async, analytics.
6. **How does Redux Toolkit let you write mutating code?** Immer records changes on a draft and produces a new immutable state.
7. **How do you avoid unnecessary re-renders with context?** Memoise the value, split contexts, use selectors via a store library.
8. **What is server state and why treat it separately?** It is a cache of remote data you do not own; it needs invalidation, refetch and dedup.
9. **What is optimistic updating?** Update the UI immediately, then roll back if the request fails.
10. **What is lifting state up?** Moving state to the nearest common parent of the components that need it.
11. **Where do you keep filter and pagination state?** In the URL, so it is shareable and survives refresh.
12. **How would you persist state across reloads?** `localStorage` with a persist middleware, or the URL, or the server.

## 4.9 STAR example: replacing Redux boilerplate

- **Situation**: Our app stored every API response in Redux with hand-written loading, error and cache logic. Adding a screen took about 300 lines of slices and thunks, and stale data bugs were common.
- **Task**: I was asked to cut the cost of new screens and fix stale data.
- **Action**: I audited the store and found about 70% of it was server data. I proposed moving server data to TanStack Query and keeping Redux Toolkit only for true client state (the editor and the cart). I built a proof of concept on one screen, measured lines of code and bug count, presented it to the team, then migrated screen by screen behind the same component interfaces.
- **Result**: New screens needed roughly a third of the code. Stale data tickets dropped to near zero because queries refetch on focus and invalidate after mutations. The Redux store shrank to two slices that new joiners could understand in a day.
