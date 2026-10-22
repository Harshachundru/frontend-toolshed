# 1. JavaScript

JavaScript is single-threaded, dynamically typed, and runs on an event loop. Almost every JS interview question tests one of six ideas: types and coercion, scope and closures, `this`, prototypes, the event loop, and async code. Master those and the trick questions become easy.

## 1.1 Data types and coercion

There are 7 primitives (`string`, `number`, `bigint`, `boolean`, `undefined`, `null`, `symbol`) and one non-primitive, `object` (arrays, functions, dates and maps are all objects). Primitives are copied by value; objects are copied by reference.

```javascript
let a = { n: 1 };
let b = a;      // b points at the same object
b.n = 2;
console.log(a.n); // 2
```

`==` converts types before comparing; `===` does not. Use `===` everywhere except `x == null`, which is a common shorthand for "null or undefined".

```javascript
0 == ''          // true
'1' == 1         // true
null == undefined // true
null === undefined // false
NaN === NaN      // false, use Number.isNaN
[] + []          // ''
[] + {}          // '[object Object]'
typeof null      // 'object' (a historic bug)
typeof function(){} // 'function'
```

Falsy values: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`. Everything else is truthy, including `[]`, `{}` and `'0'`.

## 1.2 var, let, const, hoisting and the temporal dead zone

|  | `var` | `let` | `const` |
| --- | --- | --- | --- |
| Scope | Function | Block | Block |
| Hoisted | Yes, initialised to `undefined` | Yes, but in the TDZ until declared | Yes, but in the TDZ |
| Re-declare | Allowed | Error | Error |
| Re-assign | Allowed | Allowed | Error (but object contents can change) |

Hoisting means declarations are processed before code runs. Function declarations are hoisted whole; function expressions and arrow functions are not.

```javascript
console.log(x); // undefined
var x = 5;
console.log(y); // ReferenceError: TDZ
let y = 5;
sayHi();        // works
function sayHi() {}
```

## 1.3 Scope and closures

A closure is a function that remembers the variables from the scope where it was created, even after that scope has finished running. Closures power data privacy, factories, memoisation, `debounce`, React hooks and event handlers.

```javascript
function makeCounter() {
  let count = 0;            // private
  return {
    inc: () => ++count,
    get: () => count,
  };
}
const c = makeCounter();
c.inc(); c.inc();
c.get(); // 2
```

The classic loop question:

```javascript
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));   // 3 3 3
for (let i = 0; i < 3; i++) setTimeout(() => console.log(i));   // 0 1 2
```

`var` shares one `i` across all iterations; `let` creates a fresh binding per iteration.

## 1.4 The `this` keyword

`this` is decided by *how* a function is called, not where it is written. Arrow functions are the exception: they take `this` from the surrounding scope.

| Call style | `this` is |
| --- | --- |
| `obj.method()` | `obj` |
| `fn()` plain call | `undefined` in strict mode, `window` otherwise |
| `new Fn()` | The new object |
| `fn.call(x)`, `fn.apply(x)`, `fn.bind(x)` | `x` |
| Arrow function | `this` of the enclosing scope |
| DOM event handler (`function`) | The element |

```javascript
const user = {
  name: 'Ana',
  regular() { return this.name; },
  arrow: () => this?.name,
};
user.regular(); // 'Ana'
user.arrow();   // undefined
const f = user.regular;
f();            // undefined: lost its object
```

`call` and `apply` invoke immediately (`apply` takes an array of arguments); `bind` returns a new function with `this` fixed.

## 1.5 Prototypes and classes

Every object has a hidden link (`[[Prototype]]`) to another object. Property lookups walk this chain until they find the property or reach `null`. `class` is syntax on top of prototypes.

```javascript
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}
class Dog extends Animal {
  speak() { return `${super.speak()} and barks`; }
}
Object.getPrototypeOf(new Dog('Rex')) === Dog.prototype; // true
```

## 1.6 The event loop

JS runs one call stack. Slow work (timers, network, I/O) is handed to the browser, and its callbacks wait in queues. After each task, the engine empties the **microtask queue** (promise callbacks, `queueMicrotask`, `MutationObserver`) completely before taking the next **macrotask** (`setTimeout`, `setInterval`, I/O, UI events). Rendering happens between macrotasks.

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
queueMicrotask(() => console.log('4'));
console.log('5');
// 1 5 3 4 2
```

Rule of thumb: synchronous code first, then all microtasks, then one macrotask, then microtasks again.

<EventLoopDiagram />

This is why a resolved promise logs before a `setTimeout(..., 0)`: the microtask queue is emptied before the loop takes the next macrotask.

## 1.7 Promises and async/await

A Promise represents a value that will arrive later. It is pending, then fulfilled or rejected, and never changes after settling. `async` functions always return a promise; `await` pauses that function (not the thread) until the promise settles.

| Combinator | Resolves when | Rejects when |
| --- | --- | --- |
| `Promise.all` | All fulfil | Any rejects (fail fast) |
| `Promise.allSettled` | All settle | Never |
| `Promise.race` | First settles | First settles with a rejection |
| `Promise.any` | First fulfils | All reject (`AggregateError`) |

```javascript
// Sequential: slow
const a = await getA();
const b = await getB();
// Parallel: fast
const [a2, b2] = await Promise.all([getA(), getB()]);
```

Always handle errors with `try/catch` around `await` or `.catch()`. Cancel stale requests with `AbortController`.

## 1.8 Modern JavaScript (ES6+) you should use fluently

- Destructuring, default parameters, rest and spread.
- Optional chaining `a?.b?.c` and nullish coalescing `x ?? 'default'` (only `null`/`undefined` trigger it, unlike `||`).
- Template literals, arrow functions, `class`, ES modules (`import`/`export`).
- `Map`, `Set`, `WeakMap`, `WeakSet`. `WeakMap` keys can be garbage collected.
- Array methods: `map`, `filter`, `reduce`, `find`, `some`, `every`, `flat`, `flatMap`, `at`, `toSorted`, `structuredClone` for deep copies.
- Generators and iterators, `Symbol`, `Proxy` and `Reflect` (used by Vue and MobX for reactivity).

## 1.9 Other topics that come up

- **Shallow vs deep copy**: spread and `Object.assign` copy one level; `structuredClone` copies deeply.
- **Immutability**: `Object.freeze` is shallow. React relies on new references to detect change.
- **Currying**: `add(1)(2)(3)`, transforming `f(a, b, c)` into `f(a)(b)(c)`.
- **Pure functions**: same input, same output, no side effects.
- **Memory leaks**: forgotten timers, detached DOM nodes, global variables, closures holding large objects, listeners never removed.
- **Event delegation**: one listener on a parent handles events from many children using `event.target`, thanks to bubbling.
- **Event propagation**: capture phase (top down), target, bubble phase (bottom up). `stopPropagation` stops it; `preventDefault` stops the browser default action.
- **Debounce vs throttle**: debounce waits until calls stop (search input); throttle runs at most once per interval (scroll, resize).
- **Modules**: ES modules are static and enable tree shaking; CommonJS (`require`) is dynamic.

## 1.10 Interview questions with model answers

1. **What is a closure? Give a real use.**
   - A function plus the variables it captured from its outer scope. Uses: private state, `debounce`, memoisation, React hooks capturing props.
2. **Difference between `==` and `===`?**
   - `==` coerces types first; `===` compares type and value. Prefer `===`.
3. **Difference between `null` and `undefined`?**
   - `undefined` means not yet assigned; `null` is an intentional empty value set by a developer.
4. **Explain hoisting and the TDZ.**
   - Declarations are registered before execution. `var` starts as `undefined`; `let`/`const` exist but throw if accessed before the declaration line.
5. **How does `this` work? How do arrow functions differ?**
   - Set by the call site; arrows inherit `this` lexically and cannot be rebound.
6. **Explain the event loop, microtasks and macrotasks.**
   - See 1.6. Microtasks drain fully before the next macrotask.
7. **What is prototypal inheritance?**
   - Objects delegate property lookups to their prototype chain.
8. **`call` vs `apply` vs `bind`?**
   - `call(this, a, b)`, `apply(this, [a, b])` run now; `bind` returns a bound function.
9. **`Promise.all` vs `Promise.allSettled`?**
   - `all` fails fast on the first rejection; `allSettled` reports every result.
10. **What is event delegation and why use it?**
    - One listener on a parent for many children; less memory and works for elements added later.
11. **Debounce vs throttle?** See 1.9.
12. **Shallow vs deep copy?** See 1.9.
13. **What are `map`, `filter`, `reduce`?** Transform each item, keep matching items, fold to one value. None mutate the array.
14. **What is a pure function, and why does React care?** No side effects and deterministic output; React rendering must be pure so it can re-render safely.
15. **What causes memory leaks in a single-page app?** See 1.9.
16. **What is `'use strict'`?** Opts into stricter parsing: no implicit globals, `this` is `undefined` in plain calls, silent errors become thrown. ES modules and classes are strict by default.
17. **What is the difference between `for...in` and `for...of`?** `for...in` iterates enumerable keys (including inherited); `for...of` iterates values of iterables.
18. **What is a generator?** A function (`function*`) that can pause with `yield` and resume later; returns an iterator.
19. **`localStorage` vs `sessionStorage` vs cookies?** Covered in [section 8](./browser-security).
20. **How would you deep compare two objects?** Recursively compare keys and values, handle arrays, `null`, dates and cycles; or use a library such as `lodash.isEqual`.

## 1.11 Predict the output

```javascript
// Q1
console.log(typeof typeof 1);  // 'string'
// Q2
console.log(0.1 + 0.2 === 0.3); // false (floating point); use Math.abs(a - b) < Number.EPSILON
// Q3
const obj = { a: 1 };
const arr = [obj];
obj.a = 2;
console.log(arr[0].a);          // 2
// Q4
async function f() { console.log('A'); await null; console.log('B'); }
f(); console.log('C');          // A C B
// Q5
console.log([1, 2, 3].map(parseInt)); // [1, NaN, NaN]: parseInt(value, index)
// Q6
let x = 1;
{ console.log(x); let x = 2; }  // ReferenceError (TDZ)
```

## 1.12 Coding challenges to practise by hand

**Debounce**

```javascript
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

**Throttle**

```javascript
function throttle(fn, interval) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn.apply(this, args);
    }
  };
}
```

**Promise.all polyfill**

```javascript
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let done = 0;
    if (promises.length === 0) return resolve(results);
    promises.forEach((p, i) => {
      Promise.resolve(p).then(value => {
        results[i] = value;
        if (++done === promises.length) resolve(results);
      }, reject);
    });
  });
}
```

**Deep clone (handles cycles)**

```javascript
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  for (const key of Object.keys(value)) copy[key] = deepClone(value[key], seen);
  return copy;
}
```

Also practise: `Function.prototype.bind` polyfill, `flatten` a nested array, `memoize`, `curry`, an event emitter (`on`, `off`, `emit`), retry with exponential backoff, and `groupBy`.

## 1.13 STAR example: a closure bug in production

- **Situation**: Our dashboard showed live prices. Users reported that after switching between accounts, the chart sometimes showed the previous account's data.
- **Task**: I owned the dashboard and had to find and fix the bug within the sprint.
- **Action**: I reproduced it by switching accounts quickly on a throttled network. The fetch callback closed over the account id from when the request started, and a slow response for account A arrived after the request for account B. I added an `AbortController` to cancel the previous request on account change, and a guard that ignored responses whose id no longer matched. I wrote a test that resolved two mocked requests out of order.
- **Result**: The bug reports stopped. I shared a short write-up on race conditions in async UI code, and the team added the abort pattern to our shared fetch hook.
