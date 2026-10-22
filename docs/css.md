# 7. CSS

CSS questions test whether you understand how the browser decides which rule wins and how layout is calculated. Know the box model, specificity, Flexbox, Grid and positioning cold; know modern features well enough to name them.

## 7.1 The cascade and specificity

When rules conflict, the browser compares, in order: origin and `!important`, cascade layers (`@layer`), specificity, then source order (last wins).

Specificity is counted as (IDs, classes/attributes/pseudo-classes, elements/pseudo-elements):

| Selector | Specificity |
| --- | --- |
| `p` | 0,0,1 |
| `.card p` | 0,1,1 |
| `#nav .link:hover` | 1,2,0 |
| `style=""` inline | Beats all selectors |
| `:where(...)` | Always 0 |
| `:is(...)`, `:not(...)` | Its most specific argument |

Avoid `!important` and IDs for styling; keep specificity flat with classes.

## 7.2 The box model

Every element is a box: content, padding, border, margin. With the default `box-sizing: content-box`, `width` covers content only; with `border-box`, it includes padding and border. Most projects set `*, *::before, *::after { box-sizing: border-box; }`.

**Margin collapse**: vertical margins of adjacent blocks combine into the larger one. It does not happen in Flex or Grid containers.

**Display**: `block` (full width, new line), `inline` (no width/height, flows in text), `inline-block` (flows, but takes width/height), `none` (removed from layout, unlike `visibility: hidden` which keeps the space), `flex`, `grid`, `contents`.

## 7.3 Positioning and stacking

| Value | Positioned relative to | In normal flow? |
| --- | --- | --- |
| `static` | Default | Yes |
| `relative` | Its own normal position | Yes (space kept) |
| `absolute` | Nearest positioned ancestor | No |
| `fixed` | The viewport | No |
| `sticky` | Acts relative until a scroll threshold, then sticks | Yes |

`z-index` only works within a **stacking context**. New contexts are created by positioned elements with a `z-index`, `opacity < 1`, `transform`, `filter`, `isolation: isolate` and others. That is why a `z-index: 9999` sometimes does nothing.

## 7.4 Flexbox vs Grid

**Flexbox** is one-dimensional: a row or a column. Use it for navbars, toolbars, centring, and distributing items.

```css
.row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.item { flex: 1 1 200px; } /* grow, shrink, basis */
.center { display: flex; justify-content: center; align-items: center; }
```

**Grid** is two-dimensional: rows and columns together. Use it for page layouts and card galleries.

```css
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.page {
  display: grid;
  grid-template-areas: 'header header' 'sidebar main' 'footer footer';
  grid-template-columns: 240px 1fr;
}
```

Centring anything today: `display: grid; place-items: center;`.

## 7.5 Responsive design

- Mobile-first: base styles for small screens, `@media (min-width: ...)` to add for larger.
- Fluid units: `%`, `rem` (relative to root font size, good for accessibility), `em` (relative to parent), `vw`/`vh`, `dvh` (dynamic viewport height on mobile), `clamp(1rem, 2.5vw, 2rem)` for fluid type.
- **Container queries** (`@container`) style a component based on its container's size, not the viewport. Ideal for reusable components.
- Responsive images: `srcset`, `sizes`, `<picture>`, `loading="lazy"`, `aspect-ratio` to prevent layout shift.
- User preferences: `prefers-color-scheme`, `prefers-reduced-motion`.

## 7.6 Modern CSS worth naming

Custom properties (`--brand: #0a6;`, themeable at runtime), `:has()` (the parent selector), native nesting, `@layer`, `clamp()`, logical properties (`margin-inline`), `aspect-ratio`, subgrid, `color-mix()`, view transitions, scroll-driven animations.

## 7.7 Styling approaches in React

| Approach | Pros | Cons |
| --- | --- | --- |
| Plain CSS / Sass with BEM | Simple, no runtime | Global namespace |
| CSS Modules | Locally scoped class names, no runtime | Separate files, dynamic styles need variables |
| Tailwind CSS | Fast to build, consistent design tokens, tiny output | Long class lists, learning the utilities |
| CSS-in-JS runtime (styled-components, Emotion) | Dynamic styles from props, co-location | Runtime cost, awkward with Server Components |
| Zero-runtime CSS-in-JS (vanilla-extract, Panda) | Type-safe, no runtime | Build setup |

## 7.8 Animation and performance

Animate `transform` and `opacity` only: they run on the compositor without layout or paint. Animating `width`, `top` or `margin` triggers layout on every frame. Use `will-change` sparingly. Prefer CSS transitions for simple effects and the Web Animations API or a library (Framer Motion) for complex ones.

## 7.9 Interview questions with model answers

1. **Explain the box model and `box-sizing`.** See 7.2.
2. **How is specificity calculated?** See 7.1.
3. **Flexbox vs Grid?** One dimension vs two; content-out vs layout-in.
4. **How do you centre a div?** `display: grid; place-items: center;` or flex with `justify-content` and `align-items`.
5. **`position: absolute` vs `fixed` vs `sticky`?** See 7.3.
6. **Why does my `z-index` not work?** A parent created a new stacking context.
7. **`display: none` vs `visibility: hidden` vs `opacity: 0`?** Removed from layout; hidden but space kept; invisible but still interactive and in layout.
8. **`rem` vs `em`?** Root font size vs parent font size.
9. **What are pseudo-classes and pseudo-elements?** `:hover`, `:focus-visible`, `:nth-child()` select states; `::before`, `::after`, `::placeholder` create or style parts.
10. **What are media queries vs container queries?** Viewport-based vs container-based.
11. **What is BEM?** Block\_\_Element--Modifier naming to avoid conflicts.
12. **What causes reflow and repaint?** Changing geometry triggers layout (reflow); changing colours triggers paint only.
13. **How do you implement dark mode?** CSS variables per theme, switched by `prefers-color-scheme` and a `data-theme` attribute, saved preference in `localStorage`.
14. **What is a CSS reset or normalise?** Removes or evens out browser default styles.

## 7.10 STAR example: a design system

- **Situation**: Three product teams each styled buttons, inputs and modals differently. The UI looked inconsistent and the same bugs were fixed three times.
- **Task**: I volunteered to lead a shared component library with one designer.
- **Action**: We defined design tokens (colours, spacing, typography) as CSS custom properties, built 15 core components in React with TypeScript, documented them in Storybook, and added visual regression tests with Chromatic. I ran fortnightly office hours and migrated one team's screens myself to prove it worked before asking others to adopt it.
- **Result**: All three teams adopted it within two quarters. New screen build time dropped noticeably, dark mode shipped by swapping token values, and accessibility fixes made once in the library reached every product.
