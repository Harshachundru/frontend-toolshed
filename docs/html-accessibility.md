# 6. HTML and accessibility

Semantic HTML is the cheapest way to get accessibility, SEO and good default behaviour. Interviewers use it to separate developers who build for everyone from those who only build for a mouse.

## 6.1 Semantic HTML

Use elements for their meaning: `header`, `nav`, `main` (one per page), `article`, `section`, `aside`, `footer`, `h1` to `h6` in order, `button` for actions, `a` for navigation, `ul`/`ol` for lists, `table` for tabular data, `figure`/`figcaption`, `time`. A `div` with an `onClick` has no keyboard support, no role and no focus.

```html
<!-- Bad -->
<div class="btn" onclick="save()">Save</div>
<!-- Good -->
<button type="button" onclick="save()">Save</button>
```

## 6.2 Document essentials

- `<!DOCTYPE html>` triggers standards mode.
- `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, `<html lang="en">`.
- `<title>` and `<meta name="description">` for SEO; Open Graph tags for link previews.
- **Script loading**: a plain `<script>` blocks parsing. `defer` downloads in parallel and runs in order after parsing. `async` downloads in parallel and runs as soon as it arrives, in any order. Modules are deferred by default.
- Resource hints: `preload` (needed now), `prefetch` (likely needed next), `preconnect` (warm up a connection).
- `data-*` attributes store custom data on elements.

## 6.3 Forms

Every input needs a `<label for>` (or wrapping label). Use the right `type` (`email`, `tel`, `number`, `date`) for mobile keyboards and built-in validation, `autocomplete` attributes, `required`, `pattern`, `fieldset`/`legend` for groups. Validate on the client for user experience and on the server for security.

## 6.4 Accessibility (a11y)

The target is usually **WCAG 2.2 level AA**, and in the EU the European Accessibility Act made it a legal requirement for many digital services from June 2025.

POUR principles: **P**erceivable, **O**perable, **U**nderstandable, **R**obust.

- **Keyboard**: everything works with Tab, Shift+Tab, Enter, Space, Escape and arrows. Visible focus styles (`:focus-visible`). Logical tab order; avoid positive `tabindex`.
- **Focus management**: move focus into a modal on open, trap it inside, return it on close. Move focus to the heading on route change in a SPA.
- **Alt text**: describe meaning for informative images; `alt=""` for decorative ones.
- **Colour contrast**: 4.5:1 for normal text, 3:1 for large text and UI parts. Never use colour alone to convey meaning.
- **ARIA**: the first rule of ARIA is do not use ARIA if a native element does the job. When needed: `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-expanded`, `aria-controls`, `aria-live="polite"` for announcements, `role="dialog"` with `aria-modal`.
- **Skip link** to main content, headings in order, landmarks.
- **Motion**: respect `prefers-reduced-motion`.
- **Testing**: axe DevTools, Lighthouse, `eslint-plugin-jsx-a11y`, keyboard-only walkthrough, screen readers (VoiceOver, NVDA).

## 6.5 SEO basics for frontend

Server-render or pre-render public pages, unique titles and descriptions, semantic headings, descriptive link text, `alt` text, canonical URLs, sitemap, structured data (JSON-LD), fast Core Web Vitals, and mobile-friendly layout.

## 6.6 Interview questions with model answers

1. **What is semantic HTML and why does it matter?** Meaningful elements give accessibility, SEO and keyboard behaviour for free.
2. **`async` vs `defer`?** See 6.2.
3. **`div` vs `span`?** Block vs inline generic containers with no meaning.
4. **What does the `alt` attribute do?** Text alternative for screen readers and broken images; empty for decorative images.
5. **How do you make a custom dropdown accessible?** Prefer a native `select`; otherwise follow the WAI-ARIA combobox or listbox pattern with roles, `aria-expanded`, arrow keys, Escape and focus management.
6. **What is ARIA and when should you use it?** Attributes that add semantics; only when native HTML cannot.
7. **How do you make a modal accessible?** `role="dialog"`, `aria-modal`, labelled by its heading, focus trap, Escape closes, focus returns to the trigger, background inert.
8. **What is the difference between `localStorage`, `sessionStorage` and cookies?** See [section 8](./browser-security).
9. **What are `data-*` attributes?** Custom data readable through `element.dataset`.
10. **How do you test accessibility?** Automated (axe) catches about a third of issues; manual keyboard and screen reader tests cover the rest.

## 6.7 STAR example: an accessibility audit

- **Situation**: A public-sector client required WCAG 2.2 AA before launch, and an external audit found 40 issues in our booking flow.
- **Task**: I led the fixes with two other developers and three weeks to go.
- **Action**: I grouped issues by root cause rather than fixing them one by one. Most came from three shared components: a custom dropdown, a date picker and a modal. I rebuilt the dropdown on a native `select`, replaced the date picker with an accessible library, and added focus trapping and return to the modal. I added `jsx-a11y` lint rules and axe checks to our Playwright tests, and ran a keyboard and VoiceOver session with the team.
- **Result**: The re-audit passed with no AA failures. Because the fixes were in shared components, 12 other screens improved too, and the automated checks have blocked new regressions in CI since.
