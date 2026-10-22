# 8. Browser, networking and web security

This section covers what happens between typing a URL and seeing a page, how the browser stores data, and how attackers abuse it. Security answers should always end with "and the server must enforce it too".

## 8.1 What happens when you type a URL

1. The browser parses the URL and checks its caches (HSTS list, DNS cache, HTTP cache, service worker).
2. **DNS** lookup resolves the domain to an IP address.
3. **TCP** handshake (or QUIC for HTTP/3), then a **TLS** handshake for HTTPS.
4. The browser sends an **HTTP request**; the server (often via a CDN) returns a response.
5. The browser parses **HTML into the DOM**, and **CSS into the CSSOM**. Scripts without `defer`/`async` block parsing.
6. DOM + CSSOM form the **render tree** (visible elements only).
7. **Layout** calculates geometry; **paint** fills pixels; **composite** layers onto the screen.
8. JavaScript runs, may fetch more data, and may change the DOM, triggering more layout and paint.

This is the **critical rendering path**. Shorten it by inlining critical CSS, deferring scripts and reducing round trips.

## 8.2 Client-side storage

|  | Cookies | `localStorage` | `sessionStorage` | IndexedDB |
| --- | --- | --- | --- | --- |
| Size | About 4 KB each | About 5 to 10 MB | About 5 MB | Large (hundreds of MB+) |
| Expires | Set by `Expires`/`Max-Age`, or end of session | Never | When the tab closes | Never |
| Sent to server | Automatically on every matching request | No | No | No |
| Readable by JS | Yes, unless `HttpOnly` | Yes | Yes | Yes (async API) |
| Scope | Domain and path | Origin | Origin and tab | Origin |
| Use for | Sessions, auth | Preferences, drafts | One-tab wizard state | Offline data, large caches |

Never store secrets or long-lived tokens in `localStorage`: any XSS can read it.

## 8.3 Cookies in depth

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

**First-party vs third-party cookies**: first-party belong to the site in the address bar; third-party belong to embedded domains (ads, trackers) and are increasingly blocked by Safari, Firefox and partially by Chrome. **GDPR and ePrivacy** require consent before setting non-essential cookies, which matters for any EU-facing product.

## 8.4 Same-origin policy and CORS

An **origin** is scheme + host + port. The **same-origin policy** stops a page's JavaScript from reading responses from a different origin.

**CORS** (Cross-Origin Resource Sharing) lets a server opt in. The server returns `Access-Control-Allow-Origin: https://app.example.com`. For non-simple requests (methods like `PUT`/`DELETE`, custom headers, JSON content type), the browser first sends a **preflight** `OPTIONS` request. To send cookies cross-origin, the client uses `credentials: 'include'` and the server must return `Access-Control-Allow-Credentials: true` with a specific origin, never `*`.

CORS is enforced by the browser to protect users. It is not a server-side security control: curl and Postman ignore it. A CORS error is fixed on the server (or with a dev proxy), not in React.

## 8.5 Cross-site scripting (XSS)

XSS is when an attacker gets their JavaScript to run in your page, in your users' sessions. It can steal tokens, read the page, and act as the user.

| Type | How it gets in |
| --- | --- |
| Stored | Malicious input saved in the database (a comment) and shown to others |
| Reflected | Input in a URL echoed back in the response |
| DOM-based | Client JS writes untrusted data into the DOM (`innerHTML`, `location.hash`) |

**Prevention**

- Output encoding: React escapes values in JSX by default. That protects you unless you bypass it.
- Dangerous spots in React: `dangerouslySetInnerHTML`, `href={userInput}` (allows `javascript:` URLs), `ref.current.innerHTML`, `eval`, `new Function`, third-party scripts.
- Sanitise any HTML you must render with **DOMPurify**. Validate URLs to allow only `http:` and `https:`.
- **Content Security Policy** header restricts where scripts may load from and blocks inline scripts: `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m'; object-src 'none'; base-uri 'self'`.
- `HttpOnly` cookies so a successful XSS cannot steal the session.
- Trusted Types in Chrome to lock down DOM sinks.

```jsx
// Unsafe
<div dangerouslySetInnerHTML={{ __html: comment }} />
// Safe
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment) }} />
```

## 8.6 Cross-site request forgery (CSRF)

CSRF tricks a logged-in user's browser into sending a request to your site from another site. The browser attaches cookies automatically, so the server thinks the user meant it. XSS runs code in your site; CSRF abuses the user's cookies from another site.

**Prevention**: `SameSite=Lax` or `Strict` cookies, anti-CSRF tokens (synchroniser token or double-submit cookie), checking `Origin`/`Referer` headers, and never changing state with `GET` requests. APIs that use `Authorization: Bearer` headers instead of cookies are not exposed to classic CSRF, but are more exposed to token theft through XSS.

## 8.7 Other attacks and defences

- **Clickjacking**: your site loaded in an invisible iframe. Defence: `Content-Security-Policy: frame-ancestors 'none'` (or `X-Frame-Options: DENY`).
- **Man in the middle**: use HTTPS everywhere and `Strict-Transport-Security` (HSTS).
- **Open redirects**: validate redirect targets against an allow-list.
- **Supply chain**: lock files, `npm audit`, Dependabot or Renovate, Subresource Integrity (`integrity` attribute) for CDN scripts.
- **Sensitive data in the bundle**: anything in frontend code is public. No API secrets in `.env` variables prefixed for the client.
- Other headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.

## 8.8 Authentication on the frontend

| Approach | Storage | Pros | Cons |
| --- | --- | --- | --- |
| Session cookie | `HttpOnly`, `Secure`, `SameSite` cookie | Not readable by JS, simple | Needs CSRF protection, harder cross-domain |
| JWT in memory + refresh token in `HttpOnly` cookie | Access token in a JS variable, refresh in cookie | Safer than `localStorage`, works for APIs | Token refresh logic |
| JWT in `localStorage` | `localStorage` | Easy | Any XSS steals it; avoid |

Also know: OAuth 2.0 with **Authorization Code + PKCE** for SPAs, OpenID Connect for identity, the backend-for-frontend (BFF) pattern, and silent token refresh with a single in-flight refresh request.

## 8.9 HTTP and caching

- Methods: `GET` (safe, idempotent), `POST`, `PUT` (replace, idempotent), `PATCH` (partial), `DELETE`.
- Status codes: 200, 201, 204, 301/302/304, 400, 401 (not authenticated), 403 (not allowed), 404, 409, 422, 429, 500, 502, 503.
- HTTP/2 multiplexes many requests over one connection; HTTP/3 runs on QUIC (UDP) and avoids head-of-line blocking.
- Caching: `Cache-Control: max-age=31536000, immutable` for hashed assets; `no-cache` (revalidate) for HTML; `ETag` and `Last-Modified` for conditional requests (304).
- Real-time options: polling, long polling, Server-Sent Events (server to client), WebSockets (two-way).
- **Service workers** sit between the page and the network: offline support, caching strategies, push notifications. They are the core of a PWA.
- **Web workers** run JavaScript on another thread for heavy computation.

## 8.10 Interview questions with model answers

1. **What happens when you type a URL and press Enter?** See 8.1.
2. **Cookies vs `localStorage` vs `sessionStorage`?** See 8.2.
3. **What do `HttpOnly`, `Secure` and `SameSite` do?** See 8.3.
4. **What is CORS and how do you fix a CORS error?** See 8.4.
5. **What is XSS and how does React help?** See 8.5. React escapes JSX output; the risk is bypassing it.
6. **XSS vs CSRF?** XSS runs attacker code in your page; CSRF forges requests using the victim's cookies.
7. **Where should you store a JWT?** Ideally not in `localStorage`. Access token in memory, refresh token in an `HttpOnly` cookie, or use session cookies.
8. **What is Content Security Policy?** A header that restricts script, style and frame sources.
9. **What is a preflight request?** An `OPTIONS` request the browser sends before a non-simple cross-origin request.
10. **What is the critical rendering path?** See 8.1.
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
