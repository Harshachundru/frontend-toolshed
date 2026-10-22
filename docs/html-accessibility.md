# 6. HTML and accessibility

Semantic HTML is the cheapest way to get accessibility, SEO and good default behaviour. Interviewers use it to separate developers who build for everyone from those who only build for a mouse.

## 6.1 Semantic HTML

Semantic HTML means picking the element that matches what the content is, not just how it looks.

### The problem: a `div` that looks like a button isn't one

- A `div` with an `onClick` can't be reached with the Tab key, doesn't respond to Enter or Space, and a screen reader doesn't announce it as a button.
- You would have to rebuild all of that by hand, and most people forget part of it.

### The fix: use the real element

- **Structure:** `header`, `nav`, `main` (one per page), `article`, `section`, `aside`, `footer`.
- **Headings:** `h1` to `h6`, in order, without skipping levels.
- **Actions vs navigation:** `button` does something. `a` goes somewhere.
- **Content:** `ul` and `ol` for lists, `table` for tabular data, `figure` and `figcaption`, `time`.

```html
<!-- Bad -->
<div class="btn" onclick="save()">Save</div>
<!-- Good -->
<button type="button" onclick="save()">Save</button>
```

## 6.2 Document essentials

- **`<!DOCTYPE html>`:** Tells the browser to use modern standards mode.
- **`<meta charset="utf-8">`:** Text encoding, so accents and emoji display correctly.
- **`<meta name="viewport" content="width=device-width, initial-scale=1">`:** Makes the page fit phone screens instead of showing a zoomed-out desktop page.
- **`<html lang="en">`:** Tells screen readers which language to speak.
- **`<title>` and `<meta name="description">`:** What search results show. Open Graph tags control link previews in chat apps.
- **`data-*` attributes:** Store custom data on an element.

### Script loading

- **Plain `<script>`:** Stops the HTML reader until the script downloads and runs.
- **`defer`:** Downloads in parallel and runs after the HTML is read, in the order written.
- **`async`:** Downloads in parallel and runs as soon as it arrives, in any order. Good for independent scripts such as analytics.
- **`type="module"`:** Deferred by default.

### Resource hints

- **`preload`:** Fetch this now, the page needs it.
- **`prefetch`:** Fetch this when idle, the next page will probably need it.
- **`preconnect`:** Open a connection to this server early, to save time later.

## 6.3 Forms

- **Labels:** Every input needs a `<label for>`, or a label wrapped around it. Otherwise a screen reader says only "edit text".
- **The right `type`:** `email`, `tel`, `number` and `date` bring up the right phone keyboard and give free validation.
- **`autocomplete`:** Lets the browser fill in names, addresses and passwords.
- **Built-in validation:** `required` and `pattern`.
- **Groups:** `fieldset` and `legend` for related fields, such as a set of radio buttons.
- **Validate twice:** In the browser for a good experience, and on the server for security.

## 6.4 Accessibility (a11y)

Accessibility means people can use your site whatever their abilities: with a keyboard only, a screen reader, low vision or a shaky hand.

### The standard

- The usual target is **WCAG 2.2 level AA**.
- In the EU, the European Accessibility Act made it a legal requirement for many digital services from June 2025.

### The four principles (POUR)

- **Perceivable:** Users can see or hear the content, for example through alt text and captions.
- **Operable:** Users can work every control, for example with a keyboard only.
- **Understandable:** Content and behaviour are clear and predictable.
- **Robust:** It works with assistive technology such as screen readers.

### What to check

- **Keyboard**: everything works with Tab, Shift+Tab, Enter, Space, Escape and arrows. Visible focus styles (`:focus-visible`). Logical tab order; avoid positive `tabindex`.
- **Focus management**: move focus into a modal on open, trap it inside, return it on close. Move focus to the heading on route change in a SPA.
- **Alt text**: describe meaning for informative images; `alt=""` for decorative ones.
- **Colour contrast**: 4.5:1 for normal text, 3:1 for large text and UI parts. Never use colour alone to convey meaning.
- **ARIA**: Attributes that tell screen readers what a custom element is and what state it is in. The first rule of ARIA is don't use it if a native element does the job. When needed: `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-expanded`, `aria-controls`, `aria-live="polite"` for announcements, `role="dialog"` with `aria-modal`.
- **Skip link** to main content, headings in order, landmarks.
- **Motion**: respect `prefers-reduced-motion`.
- **Testing**: axe DevTools, Lighthouse, `eslint-plugin-jsx-a11y`, keyboard-only walkthrough, screen readers (VoiceOver, NVDA).

## 6.5 SEO basics for frontend

SEO (search engine optimisation) means helping search engines find, understand and rank your pages.

- **Render the HTML:** Server-render or pre-render public pages, so crawlers see content, not an empty `div`.
- **Describe each page:** A unique title and description, semantic headings, descriptive link text instead of "click here", and `alt` text.
- **Help the crawler:** Canonical URLs to mark the main copy of a page, a sitemap, and structured data (JSON-LD).
- **Be fast and mobile-friendly:** Core Web Vitals are a ranking signal.

## 6.6 Interview questions with model answers

1. **What is semantic HTML and why does it matter?** Meaningful elements give accessibility, SEO and keyboard behaviour for free.
2. **`async` vs `defer`?** Both download without blocking. `defer` runs after the HTML is read, in order. `async` runs as soon as it arrives, in any order.
3. **`div` vs `span`?** Block vs inline generic containers with no meaning.
4. **What does the `alt` attribute do?** Text alternative for screen readers and broken images; empty for decorative images.
5. **How do you make a custom dropdown accessible?** Prefer a native `select`; otherwise follow the WAI-ARIA combobox or listbox pattern with roles, `aria-expanded`, arrow keys, Escape and focus management.
6. **What is ARIA and when should you use it?** Attributes that add semantics; only when native HTML cannot.
7. **How do you make a modal accessible?** `role="dialog"`, `aria-modal`, labelled by its heading, focus trap, Escape closes, focus returns to the trigger, background inert.
8. **What is the difference between `localStorage`, `sessionStorage` and cookies?** Cookies are small and sent to the server on every request. `localStorage` stays until cleared. `sessionStorage` is cleared when the tab closes. More in [section 8](./browser-security).
9. **What are `data-*` attributes?** Custom data readable through `element.dataset`.
10. **How do you test accessibility?** Automated (axe) catches about a third of issues; manual keyboard and screen reader tests cover the rest.

## 6.7 STAR example: an accessibility audit

- **Situation**: A public-sector client required WCAG 2.2 AA before launch, and an external audit found 40 issues in our booking flow.
- **Task**: I led the fixes with two other developers and three weeks to go.
- **Action**: I grouped issues by root cause rather than fixing them one by one. Most came from three shared components: a custom dropdown, a date picker and a modal. I rebuilt the dropdown on a native `select`, replaced the date picker with an accessible library, and added focus trapping and return to the modal. I added `jsx-a11y` lint rules and axe checks to our Playwright tests, and ran a keyboard and VoiceOver session with the team.
- **Result**: The re-audit passed with no AA failures. Because the fixes were in shared components, 12 other screens improved too, and the automated checks have blocked new regressions in CI since.
