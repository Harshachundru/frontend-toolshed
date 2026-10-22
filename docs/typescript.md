# 2. TypeScript

TypeScript is JavaScript with types added. The types are checked when you build, then removed, so the browser runs plain JavaScript.

## 2.1 Why TypeScript is used so widely

### The problem: JavaScript finds mistakes late

- A typo, a missing field or a wrong argument only fails when that line runs, often in production.
- Renaming a prop means searching the codebase and hoping you found every use.

### What TypeScript gives you

- **Bugs caught early:** Typos, reading `undefined`, and wrong argument shapes fail at build time, not in front of users.
- **Safe refactoring:** Rename a prop or change an API response type, and the compiler lists every place that breaks.
- **Editor help:** Autocomplete, go-to-definition and inline docs make a new codebase faster to learn.
- **Types as documentation:** A component's props type tells you how to use it.
- **A contract with the backend:** Types generated from an OpenAPI or GraphQL schema keep frontend and backend in step.
- **The ecosystem:** React, Next.js, Angular, Vue 3 and most libraries ship their own types.

### The catch

- You need a build step, and the advanced types take time to learn.
- **False confidence:** Types are removed before the code runs, so they can't check data that arrives at runtime. Check data at the edges of your app, such as API responses, forms and `localStorage`, with a validator such as Zod.

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

### `type` vs `interface`

Both describe the shape of an object. `type` can also describe everything else.

|  | `interface` | `type` |
| --- | --- | --- |
| Object shapes | Yes | Yes |
| Unions, tuples, primitives | No | Yes |
| Declaration merging | Yes, useful for extending library types | No |
| Extending | `extends` | Intersection `&` |
| Common team rule | Public object shapes and props | Unions and combinations |

### `any` vs `unknown` vs `never`

- **`any`:** Switches type checking off for that value. Avoid it.
- **`unknown`:** The safe way to say "I don't know yet". You must check what it is before using it. Use it for `JSON.parse` results and caught errors.
- **`never`:** A value that can't exist. Use it to prove you handled every case.

## 2.3 Narrowing and discriminated unions

Narrowing is TypeScript working out a more precise type from a check you wrote, such as an `if` or a `switch`.

### The problem: a state with optional fields allows impossible combinations

`{ loading: boolean; data?: User[]; error?: string }` lets you be loading and have an error at the same time.

### The fix: a discriminated union

Give each possible state its own shape, with a shared label field, here `status`. When you check the label, TypeScript knows which other fields exist.

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

### Other ways to narrow

`typeof`, `instanceof`, `in`, truthiness checks, and custom type guards such as `function isUser(x: unknown): x is User`.

## 2.4 Generics

A generic is a type parameter: a placeholder type that the caller fills in, like a function argument but for types.

### The problem

- A function such as `first(items)` should work for arrays of anything.
- Typing it with `any` loses the link: you put in `User[]` and get back `any`.

### The fix

`<T>` says "whatever type comes in, the same type comes out".

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

Utility types are built-in tools that make a new type from an existing one, so you don't write it twice.

| Utility | What it does |
| --- | --- |
| `Partial<T>` | Makes every property optional, good for update payloads |
| `Required<T>` | Makes every property required |
| `Readonly<T>` | Makes every property read-only |
| `Pick<T, K>` | Keeps only the keys `K` |
| `Omit<T, K>` | Removes the keys `K` |
| `Record<K, V>` | An object with keys `K` and values `V` |
| `ReturnType<F>` | The return type of a function |
| `Parameters<F>` | A tuple of a function's parameters |
| `Awaited<T>` | The type a promise resolves to |
| `NonNullable<T>` | Removes `null` and `undefined` |
| `Exclude<U, X>`, `Extract<U, X>` | Remove or keep members of a union |

### Advanced, worth naming

- **Mapped types:** `{ [K in keyof T]: ... }` builds a type by looping over keys.
- **Conditional types:** `T extends U ? X : Y` is an if-statement for types. `infer` pulls a type out of another.
- **Template literal types:** `` `on${string}` `` matches strings such as `onClick`.
- **`as const`:** Keeps the exact values, such as `'GET'`, instead of widening to `string`.
- **`satisfies`:** Checks a value against a type without losing its exact inferred type.

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

### Tips

- Type props with `type` or `interface`, not `React.FC`. It works, but adds little.
- Type events as, for example, `React.ChangeEvent<HTMLInputElement>`.
- Let TypeScript infer whatever it can. You rarely need to annotate a `useState` with a simple starting value.

## 2.7 Interview questions with model answers

1. **Why use TypeScript over JavaScript?** It catches bugs at build time, makes refactoring safe, powers editor help, and documents how code is meant to be used.
2. **`type` vs `interface`?** Both describe objects. `type` can also describe unions and tuples. `interface` supports declaration merging.
3. **`any` vs `unknown`?** `any` switches checks off. `unknown` forces you to check the type before using it.
4. **What are generics? Give an example.** Type parameters that the caller fills in, such as `useState<T>` or `ApiResponse<T>`.
5. **What is a discriminated union?** A union where every member has a shared label field, such as `status`, that TypeScript uses to narrow.
6. **What do `keyof` and `typeof` do in types?** `keyof T` is the union of `T`'s keys. `typeof value` gives you the type of a variable.
7. **What is type narrowing?** Turning a broad type into a precise one with a check, such as `typeof x === 'string'`.
8. **Does TypeScript check types at runtime?** No. Types are removed at build time. Validate outside data with Zod or similar.
9. **What is `strict` mode in `tsconfig`?** It turns on `strictNullChecks`, `noImplicitAny` and more. Always use it for new projects.
10. **What is `as` (type assertion) and why be careful?** It tells the compiler to trust you. A wrong assertion hides a bug. Prefer narrowing.
11. **What is the `satisfies` operator?** It checks a value against a type while keeping the value's exact inferred type.
12. **How do you type a component that accepts any HTML button props?** Extend `React.ComponentProps<'button'>`.
13. **What is declaration merging?** Two interfaces with the same name combine into one. Use it to extend `Window` or a library's types.
14. **How would you migrate a JS codebase to TS?** Turn on `allowJs`, convert leaf files first, start non-strict, tighten rules gradually, and ban new `any` with a lint rule.

## 2.8 STAR example: migrating to TypeScript

- **Situation:** A 60,000-line React app in JavaScript had frequent production errors such as `Cannot read properties of undefined`, mostly from API data shape changes.
- **Task:** As a senior developer, I proposed and led a gradual migration without stopping feature work.
- **Action:** I set up `allowJs` so both languages could live together, generated API types from the backend's OpenAPI spec, and converted the shared API layer and hooks first, since every screen depends on them. I added an ESLint rule banning new `any`, and a rule that every touched file gets converted. I ran two short sessions to teach the team generics and discriminated unions.
- **Result:** Over four months, 80% of the code was converted. Undefined-access errors in our error tracker dropped by about 60%, and a later API version change took two days because the compiler listed every affected screen.
