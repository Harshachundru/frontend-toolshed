# 1. JavaScript

JavaScript runs one thing at a time (single-threaded), checks types only while running (dynamically typed), and handles slow work through an event loop.

Almost every JavaScript interview question tests one of six ideas: types and coercion, scope and closures, `this`, prototypes, the event loop, and async code. Learn those six and the trick questions become easy.

## 1.1 Data types and coercion

A type is the kind of value, such as a number or a string. Coercion is JavaScript quietly converting one type into another.

### Two families of types

- **Primitives (7):** `string`, `number`, `bigint`, `boolean`, `undefined`, `null`, `symbol`. They are copied by value: you get your own copy.
- **Objects (1):** Arrays, functions, dates and maps are all objects. They are copied by reference: you get a second pointer to the same object.

```javascript
let a = { n: 1 };
let b = a;      // b points at the same object
b.n = 2;
console.log(a.n); // 2
```

### The problem: `==` converts before comparing

- **`==`:** Converts both sides to the same type, then compares. That gives surprises such as `0 == ''` being true.
- **`===`:** Compares type and value with no conversion.
- **The rule:** Use `===` everywhere. The one exception is `x == null`, a common shorthand for "null or undefined".

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

### Truthy and falsy

- **Falsy:** `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`. These act as `false` in an `if`.
- **Truthy:** Everything else, including `[]`, `{}` and `'0'`.

## 1.2 var, let, const, hoisting and the temporal dead zone

These are the three ways to declare a variable. They differ in where the variable is visible and when you can use it.

|  | `var` | `let` | `const` |
| --- | --- | --- | --- |
| Scope | Function | Block | Block |
| Hoisted | Yes, set to `undefined` | Yes, but in the TDZ until declared | Yes, but in the TDZ |
| Re-declare | Allowed | Error | Error |
| Re-assign | Allowed | Allowed | Error, but an object's contents can still change |

### Hoisting

- **What it is:** Before running your code, JavaScript registers every declaration in its scope. It is as if the declarations were moved to the top.
- **Function declarations** are hoisted whole, so you can call them before the line they are written on.
- **Function expressions and arrow functions** are not.

### The temporal dead zone (TDZ)

- `let` and `const` are hoisted too, but you can't touch them until their declaration line runs.
- The gap between the top of the block and that line is the TDZ. Reading the variable there throws a `ReferenceError`.

```javascript
console.log(x); // undefined
var x = 5;
console.log(y); // ReferenceError: TDZ
let y = 5;
sayHi();        // works
function sayHi() {}
```

## 1.3 Scope and closures

A closure is a function that remembers the variables around where it was created, even after that outer code has finished running.

### Why it matters

Closures power private data, factories, memoisation, `debounce`, React hooks and event handlers.

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

Nothing outside `makeCounter` can reach `count`. Only the two returned functions can, because they closed over it.

### The classic loop question

```javascript
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));   // 3 3 3
for (let i = 0; i < 3; i++) setTimeout(() => console.log(i));   // 0 1 2
```

- **`var`:** There is one `i` for the whole loop. By the time the timers fire, it is 3.
- **`let`:** Each loop iteration gets its own fresh `i`, so each timer remembers its own value.

## 1.4 The `this` keyword

`this` is the object a function is working on. It is decided by how the function is called, not where it is written.

| Call style | `this` is |
| --- | --- |
| `obj.method()` | `obj` |
| `fn()`, a plain call | `undefined` in strict mode, `window` otherwise |
| `new Fn()` | The new object |
| `fn.call(x)`, `fn.apply(x)`, `fn.bind(x)` | `x` |
| Arrow function | The `this` of the surrounding code |
| DOM event handler written with `function` | The element |

### The problem: losing `this`

If you take a method off its object and call it on its own, it forgets which object it belonged to.

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

### The fixes

- **Arrow functions:** They have no `this` of their own, so they use the one from the surrounding code.
- **`bind`:** Returns a new function with `this` fixed for good.
- **`call` and `apply`:** Run the function straight away with the `this` you give. `apply` takes the arguments as an array.

## 1.5 Prototypes and classes

A prototype is a backup object: if JavaScript can't find a property on an object, it looks on the object's prototype next.

### How lookup works

- Every object has a hidden link, `[[Prototype]]`, to another object.
- A property lookup walks this chain of links until it finds the property or reaches `null`.
- `class` is a friendlier way to write this. Underneath, it is still prototypes.

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

The event loop is how single-threaded JavaScript handles slow work without freezing.

### The problem: one thread

- JavaScript has one call stack, so it can do only one thing at a time.
- If it waited for a 2-second network request, the page would freeze for 2 seconds.

### The fix: hand off, then queue the callback

- **Hand off:** Slow work such as timers, network and I/O goes to the browser.
- **Queue:** When the work finishes, its callback waits in a queue.
- **Two queues:**
  - **Microtasks:** Promise callbacks, `queueMicrotask` and `MutationObserver`.
  - **Macrotasks:** `setTimeout`, `setInterval`, I/O and UI events.
- **The order:** After each task, the engine empties the whole microtask queue, then takes one macrotask. The browser can render between macrotasks.

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
queueMicrotask(() => console.log('4'));
console.log('5');
// 1 5 3 4 2
```

**The rule to remember:** synchronous code first, then all microtasks, then one macrotask, then microtasks again.

<EventLoopDiagram />

That is why a resolved promise logs before a `setTimeout(..., 0)`.

## 1.7 Promises and async/await

A promise is a placeholder for a value that will arrive later.

### The three states

- **Pending:** Still waiting.
- **Fulfilled:** The value arrived.
- **Rejected:** It failed.

Once fulfilled or rejected, a promise never changes again.

### async and await

- An `async` function always returns a promise.
- `await` pauses that one function until the promise settles. It doesn't block the thread, so the rest of the page keeps running.

### Running several at once

| Combinator | Resolves when | Rejects when |
| --- | --- | --- |
| `Promise.all` | All fulfil | Any one rejects (fails fast) |
| `Promise.allSettled` | All settle | Never |
| `Promise.race` | The first settles | The first settles with a rejection |
| `Promise.any` | The first fulfils | All reject (`AggregateError`) |

### The common mistake: awaiting one by one

```javascript
// Sequential: slow
const a = await getA();
const b = await getB();
// Parallel: fast
const [a2, b2] = await Promise.all([getA(), getB()]);
```

Always handle errors with `try/catch` around `await`, or with `.catch()`. Cancel stale requests with `AbortController`.

## 1.8 Modern JavaScript (ES6+) you should use fluently

- **Destructuring, default parameters, rest and spread.**
- **Optional chaining and nullish coalescing:** `a?.b?.c` stops if anything is missing. `x ?? 'default'` uses the default only for `null` or `undefined`, unlike `||`, which also replaces `0` and `''`.
- **Template literals, arrow functions, `class`, ES modules** (`import` and `export`).
- **`Map`, `Set`, `WeakMap`, `WeakSet`:** A `WeakMap` lets its keys be garbage collected when nothing else uses them.
- **Array methods:** `map`, `filter`, `reduce`, `find`, `some`, `every`, `flat`, `flatMap`, `at`, `toSorted`, and `structuredClone` for deep copies.
- **Generators and iterators, `Symbol`, `Proxy` and `Reflect`:** Vue and MobX use `Proxy` for reactivity.

## 1.9 Other topics that come up

- **Shallow vs deep copy:** Spread and `Object.assign` copy only the top level, so nested objects are still shared. `structuredClone` copies every level.
- **Immutability:** `Object.freeze` is shallow. React spots changes by checking for a new object, so you create new ones instead of editing.
- **Currying:** Turning `f(a, b, c)` into `f(a)(b)(c)`, as in `add(1)(2)(3)`.
- **Pure functions:** The same input always gives the same output, and nothing outside changes.
- **Memory leaks:** Memory the app never frees. Usual causes are forgotten timers, removed DOM nodes still referenced, global variables, closures holding large objects, and listeners never removed.
- **Event propagation:** An event travels down the page (capture), hits the target, then travels back up (bubble). `stopPropagation` stops the travel. `preventDefault` stops the browser's default action, such as following a link.
- **Event delegation:** Because events bubble, one listener on a parent can handle clicks for all its children by checking `event.target`.
- **Debounce vs throttle:** Debounce waits until the calls stop, such as a search box. Throttle runs at most once per interval, such as scroll or resize handlers.
- **Modules:** ES modules are static, so bundlers can remove unused code (tree shaking). CommonJS `require` is dynamic, so they can't.

## 1.10 Interview questions with model answers

1. **What is a closure? Give a real use.**
   - A function plus the variables it captured from where it was created. Uses: private state, `debounce`, memoisation, React hooks capturing props.
2. **Difference between `==` and `===`?**
   - `==` converts types first. `===` compares type and value. Prefer `===`.
3. **Difference between `null` and `undefined`?**
   - `undefined` means nothing has been assigned yet. `null` is an empty value a developer set on purpose.
4. **Explain hoisting and the TDZ.**
   - Declarations are registered before the code runs. `var` starts as `undefined`. `let` and `const` exist but throw if read before their declaration line.
5. **How does `this` work? How do arrow functions differ?**
   - The way a function is called sets `this`. Arrow functions take `this` from the surrounding code and can't be rebound.
6. **Explain the event loop, microtasks and macrotasks.**
   - Slow work is handed to the browser and its callbacks queue up. After each task, all microtasks (promises) run, then one macrotask (timers, events).
7. **What is prototypal inheritance?**
   - When a property is missing, the object looks it up on its prototype, then that object's prototype, up the chain.
8. **`call` vs `apply` vs `bind`?**
   - `call(this, a, b)` and `apply(this, [a, b])` run now. `bind` returns a new function with `this` fixed.
9. **`Promise.all` vs `Promise.allSettled`?**
   - `all` fails on the first rejection. `allSettled` waits and reports every result.
10. **What is event delegation and why use it?**
    - One listener on a parent handles events from many children. It uses less memory and works for children added later.
11. **Debounce vs throttle?** Debounce waits until calls stop. Throttle runs at most once per interval.
12. **Shallow vs deep copy?** A shallow copy shares nested objects with the original. A deep copy duplicates every level.
13. **What are `map`, `filter`, `reduce`?** Transform each item, keep matching items, combine everything into one value. None of them change the original array.
14. **What is a pure function, and why does React care?** Same input, same output, no side effects. React may render a component many times, so rendering must be pure to be safe.
15. **What causes memory leaks in a single-page app?** Timers and listeners never removed, removed DOM nodes still referenced, globals, and closures holding large objects.
16. **What is `'use strict'`?** Stricter rules: no accidental globals, `this` is `undefined` in plain calls, and silent errors throw. ES modules and classes are strict by default.
17. **What is the difference between `for...in` and `for...of`?** `for...in` loops over an object's keys, including inherited ones. `for...of` loops over the values of an array or other iterable.
18. **What is a generator?** A `function*` that can pause with `yield` and resume later. It returns an iterator.
19. **`localStorage` vs `sessionStorage` vs cookies?** Covered in [section 8](./browser-security).
20. **How would you deep compare two objects?** Compare keys and values recursively, and handle arrays, `null`, dates and cycles. Or use a library function such as `lodash.isEqual`.

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

**Debounce:** Wait until the calls stop for `delay` ms, then run once.

```javascript
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

**Throttle:** Run at most once every `interval` ms, and ignore calls in between.

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

**Promise.all polyfill:** Keep results in input order, resolve when the count reaches the total, reject on the first failure.

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

**Deep clone:** Copy every level. The `WeakMap` remembers objects already copied, so an object that refers to itself doesn't loop forever.

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

Also practise: a `Function.prototype.bind` polyfill, `flatten` a nested array, `memoize`, `curry`, an event emitter (`on`, `off`, `emit`), retry with exponential backoff, and `groupBy`.

## 1.13 STAR example: a closure bug in production

- **Situation:** Our dashboard showed live prices. Users reported that after switching between accounts, the chart sometimes showed the previous account's data.
- **Task:** I owned the dashboard and had to find and fix the bug within the sprint.
- **Action:** I reproduced it by switching accounts quickly on a throttled network. The fetch callback closed over the account id from when the request started, and a slow response for account A arrived after the request for account B. I added an `AbortController` to cancel the previous request on account change, and a guard that ignored responses whose id no longer matched. I wrote a test that resolved two mocked requests out of order.
- **Result:** The bug reports stopped. I shared a short write-up on race conditions in async UI code, and the team added the abort pattern to our shared fetch hook.
