# 2. TypeScript

TypeScript is JavaScript plus a static type system that is checked at build time and erased at runtime. Teams adopt it because it catches a whole class of bugs before code ships and makes large codebases safe to change.

## 2.1 Why TypeScript is used so widely

- **Bugs caught early**: typos, `undefined` access and wrong argument shapes fail at compile time, not in production.
- **Safe refactoring**: rename a prop or change an API response type and the compiler lists every place that breaks.
- **Editor support**: autocomplete, go-to-definition and inline docs make onboarding faster.
- **Types as documentation**: a component's props interface tells you how to use it.
- **Contracts with the backend**: types generated from OpenAPI or GraphQL schemas keep frontend and backend in sync.
- **Ecosystem**: React, Next.js, Angular, Vue 3 and most libraries ship first-class types.

The costs: a build step, a learning curve for advanced types, and false confidence, because types do not validate data at runtime. Use a runtime validator such as Zod at system boundaries (API responses, forms, `localStorage`).

## 2.2 Core concepts

```typescript
// Primitives, arrays, tuples
let id: number = 1;
let tags: string[] = ['a'];
let point: [number, number] = [1, 2];

// Union and literal types
type Status = 'idle' | 'loading' | 'success' | 'error';

// Object shapes
interface User {
  id: number;
  name: string;
  email?: string;          // optional
  readonly createdAt: Date;
}

// Functions
function greet(user: User): string {
  return `Hi ${user.name}`;
}
```

**`type` vs `interface`**

|  | `interface` | `type` |
| --- | --- | --- |
| Object shapes | Yes | Yes |
| Unions, tuples, primitives | No | Yes |
| Declaration merging | Yes (useful for extending library types) | No |
| Extending | `extends` | Intersection `&` |
| Common team rule | Public object shapes and props | Unions, utility compositions |

**`any` vs `unknown` vs `never`**

- `any` switches the type checker off. Avoid it.
- `unknown` is the safe "I don't know yet": you must narrow it before use. Use it for `JSON.parse` results and caught errors.
- `never` is a value that cannot exist. Use it for exhaustive checks.

## 2.3 Narrowing and discriminated unions

```typescript
type State =
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; error: string };

function render(s: State) {
  switch (s.status) {
    case 'loading': return 'Loading';
    case 'success': return s.data.length;   // data is known here
    case 'error':   return s.error;
    default: {
      const check: never = s;  // compile error if a case is missing
      return check;
    }
  }
}
```

Other narrowing tools: `typeof`, `instanceof`, `in`, truthiness checks, and custom type guards (`function isUser(x: unknown): x is User`).

## 2.4 Generics

Generics let a function or type work with many types while keeping them connected.

```typescript
function first<T>(items: T[]): T | undefined {
  return items[0];
}

function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

## 2.5 Utility types

| Utility | What it does |
| --- | --- |
| `Partial<T>` | All properties optional (good for update payloads) |
| `Required<T>` | All properties required |
| `Readonly<T>` | All properties read-only |
| `Pick<T, K>` | Keep only keys `K` |
| `Omit<T, K>` | Remove keys `K` |
| `Record<K, V>` | Object with keys `K` and values `V` |
| `ReturnType<F>` | Return type of a function |
| `Parameters<F>` | Tuple of a function's parameters |
| `Awaited<T>` | Type a promise resolves to |
| `NonNullable<T>` | Removes `null` and `undefined` |
| `Exclude<U, X>` / `Extract<U, X>` | Filter union members |

Advanced: mapped types (`{ [K in keyof T]: ... }`), conditional types (`T extends U ? X : Y`), `infer`, template literal types, `as const`, and the `satisfies` operator, which checks a value against a type without widening it.

## 2.6 TypeScript with React

```typescript
type ButtonProps = {
  variant?: 'primary' | 'secondary';
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function Button({ variant = 'primary', children, ...rest }: ButtonProps) {
  return <button className={variant} {...rest}>{children}</button>;
}

const [user, setUser] = useState<User | null>(null);
const inputRef = useRef<HTMLInputElement>(null);

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  // ...
  return data;
}
```

Tips: type props with `type` or `interface`, not `React.FC` (it is fine but adds little); type events as `React.ChangeEvent<HTMLInputElement>`; let TypeScript infer what it can.

## 2.7 Interview questions with model answers

1. **Why use TypeScript over JavaScript?** See 2.1: early bug detection, refactoring safety, tooling, documentation.
2. **`type` vs `interface`?** See the table in 2.2.
3. **`any` vs `unknown`?** `unknown` forces narrowing before use; `any` disables checks.
4. **What are generics? Give an example.** Type parameters, e.g. `useState<T>` or `ApiResponse<T>`.
5. **What is a discriminated union?** A union where each member has a shared literal field (`status`) that TypeScript uses to narrow.
6. **What does `keyof` and `typeof` do in types?** `keyof T` is the union of `T`'s keys; `typeof value` gets the type of a variable.
7. **What is type narrowing?** Refining a broad type to a specific one with checks.
8. **Does TypeScript check types at runtime?** No. Types are erased; validate external data with Zod or similar.
9. **What is `strict` mode in `tsconfig`?** Enables `strictNullChecks`, `noImplicitAny` and more. Always on for new projects.
10. **What is `as` (type assertion) and why be careful?** It tells the compiler to trust you; wrong assertions hide bugs. Prefer narrowing.
11. **What is the `satisfies` operator?** Validates a value against a type while keeping its precise inferred type.
12. **How do you type a component that accepts any HTML button props?** Extend `React.ComponentProps<'button'>`.
13. **What is declaration merging?** Interfaces with the same name combine; used to extend `Window` or library types.
14. **How would you migrate a JS codebase to TS?** Enable `allowJs`, convert leaf files first, start non-strict, tighten rules gradually, ban new `any` with lint.

## 2.8 STAR example: migrating to TypeScript

- **Situation**: A 60,000-line React app in JavaScript had frequent production errors like `Cannot read properties of undefined`, mostly from API data shape changes.
- **Task**: As a senior developer, I proposed and led an incremental migration without stopping feature work.
- **Action**: I set up `allowJs` so both languages could live together, generated API types from the backend's OpenAPI spec, and converted the shared API layer and hooks first, since every screen depends on them. I added an ESLint rule banning new `any`, and a rule that every touched file gets converted. I ran two short sessions to teach the team generics and discriminated unions.
- **Result**: Over four months, 80% of the code was converted. Undefined-access errors in our error tracker dropped by about 60%, and a later API version change was done in two days because the compiler listed every affected screen.
