# 7. CSS

CSS questions test two things: how the browser decides which rule wins, and how it works out the layout. Know the box model, specificity, Flexbox, Grid and positioning cold. Know the modern features well enough to name them.

## 7.1 The cascade and specificity

The cascade is how the browser picks a winner when several rules style the same element.

### The order of the tie-breakers

1. **Origin and `!important`:** Your styles beat browser defaults, and `!important` beats normal rules.
2. **Cascade layers (`@layer`):** A later layer beats an earlier one.
3. **Specificity:** The more precise selector wins.
4. **Source order:** If everything else ties, the rule written last wins.

### Specificity is a score with three columns

Count (IDs, classes and attributes and pseudo-classes, elements and pseudo-elements). Compare column by column from the left, like version numbers.

| Selector | Specificity |
| --- | --- |
| `p` | 0,0,1 |
| `.card p` | 0,1,1 |
| `#nav .link:hover` | 1,2,0 |
| `style=""` inline | Beats all selectors |
| `:where(...)` | Always 0 |
| `:is(...)`, `:not(...)` | Its most specific argument |

**The rule:** Avoid `!important` and IDs for styling. Keep specificity flat by using single classes, so any rule is easy to override.

## 7.2 The box model

Every element is a box made of four layers: content, padding, border and margin, from the inside out.

### The problem: `width` doesn't mean what you expect

- **`content-box`, the default:** `width` covers only the content. Padding and border are added on top, so a `width: 200px` box with 20px padding is really 240px wide.
- **`border-box`:** `width` includes padding and border, so 200px means 200px.
- **The fix most projects use:** `*, *::before, *::after { box-sizing: border-box; }`.

### Margin collapse

- When two blocks sit one above the other, their vertical margins merge into the larger one instead of adding up.
- It doesn't happen inside Flex or Grid containers.

### Display values

- **`block`:** Full width, starts on a new line.
- **`inline`:** Flows inside text. Ignores `width` and `height`.
- **`inline-block`:** Flows inside text, but accepts `width` and `height`.
- **`none`:** Removed from the layout entirely. Compare `visibility: hidden`, which hides the element but keeps its space.
- **`flex`, `grid`, `contents`:** Covered below.

## 7.3 Positioning and stacking

`position` decides what an element is placed relative to, and whether it still takes up space.

| Value | Positioned relative to | Keeps its space? |
| --- | --- | --- |
| `static` | Default, normal flow | Yes |
| `relative` | Its own normal position | Yes |
| `absolute` | The nearest positioned ancestor | No |
| `fixed` | The viewport | No |
| `sticky` | Acts as `relative` until you scroll past a point, then sticks | Yes |

### The problem: "`z-index: 9999` does nothing"

- `z-index` only compares elements inside the same stacking context, a group the browser layers as one unit.
- A parent creates a new stacking context if it has, for example, a `z-index` with a position, `opacity` below 1, a `transform`, a `filter` or `isolation: isolate`.
- A child can never rise above its parent's context, however high its `z-index`.

## 7.4 Flexbox vs Grid

The difference is the number of directions.

### Flexbox: one direction

A row or a column. Use it for navbars, toolbars, centring, and spreading items out.

```css
.row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.item { flex: 1 1 200px; } /* grow, shrink, basis */
.center { display: flex; justify-content: center; align-items: center; }
```

### Grid: two directions

Rows and columns together. Use it for page layouts and card galleries.

```css
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.page {
  display: grid;
  grid-template-areas: 'header header' 'sidebar main' 'footer footer';
  grid-template-columns: 240px 1fr;
}
```

**Centring anything today:** `display: grid; place-items: center;`.

## 7.5 Responsive design

Responsive design means one page that adapts to any screen size.

- **Mobile first:** Write the base styles for small screens, then add to them for larger screens with `@media (min-width: ...)`.
- **Fluid units:**
  - `%`: Relative to the parent's size.
  - `rem`: Relative to the root font size. Good for accessibility, because it follows the user's font setting.
  - `em`: Relative to the parent's font size.
  - `vw`, `vh`: A percentage of the viewport. `dvh` is the dynamic viewport height, which allows for mobile browser bars.
  - `clamp(1rem, 2.5vw, 2rem)`: A fluid size with a minimum and a maximum, good for headings.
- **Container queries (`@container`):** Style a component by the size of its container, not the screen. Ideal for reusable components that appear in a wide main area and a narrow sidebar.
- **Responsive images:** `srcset`, `sizes`, `<picture>`, `loading="lazy"`, and `aspect-ratio` to reserve space and prevent layout shift.
- **User preferences:** `prefers-color-scheme` for dark mode, `prefers-reduced-motion` to tone down animation.

## 7.6 Modern CSS worth naming

- **Custom properties:** Variables such as `--brand: #0a6;`, which you can change at runtime for theming.
- **`:has()`:** The parent selector. `.card:has(img)` styles cards that contain an image.
- **Native nesting, `@layer`, `clamp()`.**
- **Logical properties:** `margin-inline` instead of left and right, so layouts flip for right-to-left languages.
- **`aspect-ratio`, subgrid, `color-mix()`, view transitions, scroll-driven animations.**

## 7.7 Styling approaches in React

| Approach | Pros | Cons |
| --- | --- | --- |
| Plain CSS or Sass with BEM | Simple, no runtime | One global namespace, so names can clash |
| CSS Modules | Class names scoped to one component, no runtime | Separate files; dynamic styles need variables |
| Tailwind CSS | Fast to build, consistent design tokens, tiny output | Long class lists, learning the utilities |
| Runtime CSS-in-JS (styled-components, Emotion) | Dynamic styles from props, styles next to the component | Runtime cost, awkward with server components |
| Zero-runtime CSS-in-JS (vanilla-extract, Panda) | Type-safe, no runtime | Build setup |

## 7.8 Animation and performance

### The problem: some properties are expensive to animate

- Animating `width`, `top` or `margin` makes the browser redo layout on every frame, which stutters.

### The fix: animate `transform` and `opacity`

- These two run on the compositor, the part of the browser that moves finished layers. They skip layout and paint.
- Use `will-change` sparingly, only on elements about to animate.
- Use CSS transitions for simple effects, and the Web Animations API or a library such as Framer Motion for complex ones.

## 7.9 Interview questions with model answers

1. **Explain the box model and `box-sizing`.** Content, padding, border, margin. With `content-box`, `width` is content only. With `border-box`, it includes padding and border.
2. **How is specificity calculated?** Count IDs, then classes, attributes and pseudo-classes, then elements. Compare column by column. Inline styles beat all selectors.
3. **Flexbox vs Grid?** Flexbox is one direction and sizes from the content out. Grid is two directions and places content into a layout.
4. **How do you centre a div?** `display: grid; place-items: center;`, or flex with `justify-content` and `align-items`.
5. **`position: absolute` vs `fixed` vs `sticky`?** `absolute` is relative to the nearest positioned ancestor. `fixed` is relative to the viewport. `sticky` scrolls normally until a point, then sticks.
6. **Why does my `z-index` not work?** A parent created a new stacking context, and a child can't rise above it.
7. **`display: none` vs `visibility: hidden` vs `opacity: 0`?** `none` removes it from the layout. `hidden` hides it but keeps the space. `opacity: 0` makes it invisible but it still takes space and can be clicked.
8. **`rem` vs `em`?** `rem` follows the root font size. `em` follows the parent's.
9. **What are pseudo-classes and pseudo-elements?** Pseudo-classes such as `:hover`, `:focus-visible` and `:nth-child()` select a state. Pseudo-elements such as `::before`, `::after` and `::placeholder` create or style part of an element.
10. **What are media queries vs container queries?** Media queries look at the screen. Container queries look at the component's container.
11. **What is BEM?** A naming scheme, `block__element--modifier`, that avoids class name clashes.
12. **What causes reflow and repaint?** Changing size or position makes the browser redo layout (reflow). Changing only colours makes it repaint.
13. **How do you implement dark mode?** CSS variables per theme, switched by `prefers-color-scheme` and a `data-theme` attribute, with the user's choice saved in `localStorage`.
14. **What is a CSS reset or normalise?** A stylesheet that removes or evens out each browser's default styles.

## 7.10 STAR example: a design system

- **Situation:** Three product teams each styled buttons, inputs and modals differently. The UI looked inconsistent and the same bugs were fixed three times.
- **Task:** I volunteered to lead a shared component library with one designer.
- **Action:** We defined design tokens (colours, spacing, typography) as CSS custom properties, built 15 core components in React with TypeScript, documented them in Storybook, and added visual regression tests with Chromatic. I ran fortnightly office hours and migrated one team's screens myself to prove it worked before asking others to adopt it.
- **Result:** All three teams adopted it within two quarters. New screens took noticeably less time to build, dark mode shipped by swapping token values, and accessibility fixes made once in the library reached every product.
