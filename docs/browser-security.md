# 8. Browser, networking and web security

This section covers what happens between typing a URL and seeing a page, how the browser stores data, and how attackers abuse it. Security answers should always end with "and the server must enforce it too".

## 8.1 What happens when you type a URL

The short version: find the server, open a secure line to it, ask for the page, then turn the reply into pixels.

### Find the server and connect

1. **Check the caches:** The browser checks whether it already knows the answer: the HSTS list, DNS cache, HTTP cache and any service worker.
2. **DNS lookup:** It turns the domain name, such as `example.com`, into an IP address, like looking up a phone number.
3. **Connect:** A TCP handshake (or QUIC for HTTP/3) opens a connection. A TLS handshake then encrypts it for HTTPS.

### Ask for the page

4. **HTTP request:** The browser asks for the page. The server, often through a CDN, sends back the HTML.

### Turn the reply into pixels

5. **Parse:** HTML becomes the DOM and CSS becomes the CSSOM. A script without `defer` or `async` pauses this.
6. **Render tree:** The DOM and CSSOM combine into the visible elements with their styles.
7. **Layout, paint, composite:** Work out sizes and positions, fill in the pixels, and stack the layers on screen.
8. **JavaScript runs:** It may fetch more data and change the page, which triggers more layout and paint.

Steps 5 to 7 are the [critical rendering path](/core-concepts#_1-critical-rendering-path). Shorten it by inlining critical CSS, deferring scripts and cutting round trips.

## 8.2 Client-side storage

The browser offers four places to keep data. The big difference is whether the data is sent to the server automatically, and whether JavaScript can read it.

|  | Cookies | `localStorage` | `sessionStorage` | IndexedDB |
| --- | --- | --- | --- | --- |
| Size | About 4 KB each | About 5 to 10 MB | About 5 MB | Large (hundreds of MB+) |
| Expires | Set by `Expires`/`Max-Age`, or end of session | Never | When the tab closes | Never |
| Sent to server | Automatically on every matching request | No | No | No |
| Readable by JS | Yes, unless `HttpOnly` | Yes | Yes | Yes (async API) |
| Scope | Domain and path | Origin | Origin and tab | Origin |
| Use for | Sessions, auth | Preferences, drafts | One-tab wizard state | Offline data, large caches |

**The rule:** Never store secrets or long-lived tokens in `localStorage`. Any injected script (XSS, section 8.5) can read it.

## 8.3 Cookies in depth

A cookie is a small piece of data the server asks the browser to keep and send back on every request to that site. Attributes on the cookie control who can read it and when it is sent.

```http
Set-Cookie: session=abc123; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600
```

| Attribute | Purpose |
| --- | --- |
| `HttpOnly` | JavaScript cannot read it, so XSS cannot steal it |
| `Secure` | Only sent over HTTPS |
| `SameSite=Strict` | Never sent on cross-site requests |
| `SameSite=Lax` (browser default) | Sent on top-level navigation (clicking a link), not on cross-site POSTs or iframes |
| `SameSite=None` | Sent cross-site; requires `Secure` |
| `Domain`, `Path` | Which hosts and paths receive it |
| `Expires`, `Max-Age` | Lifetime; without them it is a session cookie |
| `__Host-` prefix | Forces `Secure`, `Path=/` and no `Domain`, so subdomains cannot overwrite it |

### First-party vs third-party cookies

- **First-party:** Belong to the site in the address bar.
- **Third-party:** Belong to other domains embedded in the page, such as ads and trackers. Safari and Firefox block them, and Chrome partly does.

### The law

GDPR and ePrivacy require consent before setting non-essential cookies. That matters for any product used in the EU.

## 8.4 Same-origin policy and CORS

- **Origin:** Scheme, host and port together. `https://app.example.com:443` and `https://api.example.com:443` are different origins.
- **Same-origin policy:** A page's JavaScript can't read responses from a different origin.

### The problem it prevents

- You are logged in to your bank. You visit an evil site.
- Without this rule, the evil site's JavaScript could call your bank's API with your cookies and read your balance.

### CORS: the server opts in

CORS (Cross-Origin Resource Sharing) lets a server say which other origins may read its responses.

- **The allow header:** The server returns `Access-Control-Allow-Origin: https://app.example.com`.
- **Preflight:** For a request that isn't simple, such as `PUT` or `DELETE`, a custom header or a JSON body, the browser first sends an `OPTIONS` request to ask permission.
- **With cookies:** The client sets `credentials: 'include'`, and the server must return `Access-Control-Allow-Credentials: true` with one specific origin, never `*`.

### The catch

- The browser enforces CORS to protect users. It isn't server security: curl and Postman ignore it.
- You fix a CORS error on the server, or with a dev proxy, never in React.

## 8.5 Cross-site scripting (XSS)

Cross-site scripting (XSS) is an attacker getting their JavaScript to run inside your page.

### The problem

- Once it runs in your page, it is your page. It can steal tokens, read everything on screen, and act as the user.
- It usually gets in through user input that you display without making it safe.

| Type | How it gets in |
| --- | --- |
| Stored | Malicious input saved in the database (a comment) and shown to others |
| Reflected | Input in a URL echoed back in the response |
| DOM-based | Client JS writes untrusted data into the DOM (`innerHTML`, `location.hash`) |

### The fix: layers of defence

- **Escape output:** React escapes values in JSX by default, so `<script>` shows as text. That protects you unless you bypass it.
- **Know the bypasses in React:** `dangerouslySetInnerHTML`, `href={userInput}` (which allows `javascript:` URLs), `ref.current.innerHTML`, `eval`, `new Function`, and third-party scripts.
- **Sanitise HTML you must render** with DOMPurify. Allow only `http:` and `https:` URLs.
- **Content Security Policy (CSP):** A header that says where scripts may load from and blocks inline scripts, for example `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m'; object-src 'none'; base-uri 'self'`.
- **`HttpOnly` cookies:** Even if XSS gets in, it can't read the session cookie.
- **Trusted Types (Chrome):** Blocks raw strings from reaching dangerous DOM APIs such as `innerHTML`.

```jsx
// Unsafe
<div dangerouslySetInnerHTML={{ __html: comment }} />
// Safe
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment) }} />
```

## 8.6 Cross-site request forgery (CSRF)

Cross-site request forgery (CSRF) tricks your logged-in browser into sending a request you didn't mean to send.

### The problem

- You are logged in to your bank. An evil site contains a hidden form that posts to `bank.com/transfer`.
- Your browser attaches your bank cookies automatically, so the bank thinks you sent it.
- **XSS vs CSRF:** XSS runs the attacker's code inside your site. CSRF stays on the attacker's site and abuses your cookies.

### The fix

- **`SameSite=Lax` or `Strict` cookies:** The browser doesn't send them on cross-site posts.
- **Anti-CSRF tokens:** A secret value the real page includes in every form, which an evil site can't know.
- **Check the `Origin` or `Referer` header** on the server.
- **Never change data with a `GET` request.**

### The trade-off with tokens

APIs that use an `Authorization: Bearer` header instead of cookies aren't exposed to classic CSRF, because nothing is sent automatically. But the token has to live somewhere JavaScript can read it, so XSS can steal it.

## 8.7 Other attacks and defences

- **Clickjacking**: your site loaded in an invisible iframe. Defence: `Content-Security-Policy: frame-ancestors 'none'` (or `X-Frame-Options: DENY`).
- **Man in the middle**: use HTTPS everywhere and `Strict-Transport-Security` (HSTS).
- **Open redirects**: validate redirect targets against an allow-list.
- **Supply chain**: lock files, `npm audit`, Dependabot or Renovate, Subresource Integrity (`integrity` attribute) for CDN scripts.
- **Sensitive data in the bundle**: anything in frontend code is public. No API secrets in `.env` variables prefixed for the client.
- Other headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.

## 8.8 Authentication on the frontend

The question is where to keep proof that the user is logged in. The trade-off is between XSS, which can read anything JavaScript can read, and CSRF, which abuses anything sent automatically.

| Approach | Storage | Pros | Cons |
| --- | --- | --- | --- |
| Session cookie | `HttpOnly`, `Secure`, `SameSite` cookie | Not readable by JS, simple | Needs CSRF protection, harder cross-domain |
| JWT in memory + refresh token in `HttpOnly` cookie | Access token in a JS variable, refresh in cookie | Safer than `localStorage`, works for APIs | Token refresh logic |
| JWT in `localStorage` | `localStorage` | Easy | Any XSS steals it; avoid |

### Also know

- **OAuth 2.0 Authorization Code with PKCE:** The safe login flow for SPAs. PKCE stops a stolen login code from being usable.
- **OpenID Connect:** Adds "who is this user" on top of OAuth.
- **The BFF pattern:** A small server holds the tokens, and the browser only gets an `HttpOnly` session cookie.
- **Silent refresh:** Get a new access token in the background before the old one expires, with only one refresh request in flight at a time.

## 8.9 HTTP and caching

- Methods: `GET` (safe, idempotent), `POST`, `PUT` (replace, idempotent), `PATCH` (partial), `DELETE`.
- Status codes: 200, 201, 204, 301/302/304, 400, 401 (not authenticated), 403 (not allowed), 404, 409, 422, 429, 500, 502, 503.
- HTTP/2 multiplexes many requests over one connection; HTTP/3 runs on QUIC (UDP) and avoids head-of-line blocking.
- Caching: `Cache-Control: max-age=31536000, immutable` for hashed assets; `no-cache` (revalidate) for HTML; `ETag` and `Last-Modified` for conditional requests (304).
- Real-time options: polling, long polling, Server-Sent Events (server to client), WebSockets (two-way).
- **Service workers** sit between the page and the network: offline support, caching strategies, push notifications. They are the core of a PWA.
- **Web workers** run JavaScript on another thread for heavy computation.

## 8.10 Interview questions with model answers

1. **What happens when you type a URL and press Enter?** Cache check, DNS lookup, TCP and TLS handshakes, HTTP request, then the browser parses HTML and CSS, builds the render tree, and does layout, paint and composite.
2. **Cookies vs `localStorage` vs `sessionStorage`?** Cookies are small and sent to the server on every request. `localStorage` stays until cleared. `sessionStorage` is cleared when the tab closes. Neither storage is sent to the server.
3. **What do `HttpOnly`, `Secure` and `SameSite` do?** `HttpOnly` hides the cookie from JavaScript. `Secure` sends it only over HTTPS. `SameSite` controls whether it is sent on cross-site requests.
4. **What is CORS and how do you fix a CORS error?** A way for a server to let other origins read its responses. Fix the error on the server by returning the right `Access-Control-Allow-*` headers.
5. **What is XSS and how does React help?** An attacker's script running in your page. React escapes JSX output by default. The risk is bypassing it, for example with `dangerouslySetInnerHTML`.
6. **XSS vs CSRF?** XSS runs attacker code in your page; CSRF forges requests using the victim's cookies.
7. **Where should you store a JWT?** Ideally not in `localStorage`. Access token in memory, refresh token in an `HttpOnly` cookie, or use session cookies.
8. **What is Content Security Policy?** A header that restricts script, style and frame sources.
9. **What is a preflight request?** An `OPTIONS` request the browser sends before a non-simple cross-origin request.
10. **What is the critical rendering path?** The steps from HTML and CSS to the first pixels: DOM, CSSOM, render tree, layout, paint and composite.
11. **Reflow vs repaint?** Layout recalculation vs repainting pixels; reflow is more expensive.
12. **What is a service worker?** A background script that intercepts network requests for offline and caching.
13. **401 vs 403?** Not authenticated vs authenticated but not allowed.
14. **What is HTTPS and why does it matter for cookies?** Encrypts traffic; `Secure` cookies are only sent over it.
15. **How do WebSockets differ from HTTP?** A persistent two-way connection after an HTTP upgrade.

## 8.11 STAR example: a stored XSS finding

- **Situation**: A penetration test found that our rich-text comments, rendered with `dangerouslySetInnerHTML`, allowed a stored XSS. Our access token was in `localStorage`, so the impact was account takeover.
- **Task**: I was responsible for the fix and for reducing the impact of any future XSS.
- **Action**: Same day, I added DOMPurify sanitisation on render and a server-side sanitiser on save, and we deployed. Then I worked with the backend team to move the refresh token to an `HttpOnly`, `Secure`, `SameSite=Strict` cookie and keep the access token in memory only. I introduced a Content Security Policy in report-only mode, fixed the violations over two weeks, then enforced it. I added a lint rule that flags any `dangerouslySetInnerHTML` without a sanitiser.
- **Result**: The retest passed. The CSP report endpoint later caught a browser extension injecting scripts, which confirmed it was working. The security checklist I wrote became part of our pull request template.
