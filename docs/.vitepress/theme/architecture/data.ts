// Scenario and step data for the generic diagrams on the architecture patterns page.
import type { Scenario, Step } from '../concepts/types'

export const mvcSteps: Step[] = [
  { title: 'Click a link', sub: 'GET /orders/7', detail: 'Every navigation is a full HTTP request. The browser throws away the current page.' },
  { title: 'Router', sub: 'URL to controller', detail: 'The server framework (Rails, Django, Spring, Laravel) maps the URL to a controller action.' },
  { title: 'Controller', sub: 'handles the request', detail: 'Checks the session, reads parameters, and asks the model for data. All logic lives on the server.' },
  { title: 'Model', sub: 'database', detail: 'The model loads and validates data, often through an ORM.' },
  { title: 'View', sub: 'template', detail: 'A server template (ERB, Jinja, Blade, JSP) mixes data into HTML.' },
  { title: 'HTML response', sub: 'whole page', detail: 'The browser receives a complete page and renders it from scratch. The next click repeats all of this, so the page flashes and state such as scroll position and form input is lost.' },
]

export const bffActors = ['Mobile app', 'Web app', 'BFF / gateway', 'Services']

export const bffScenarios: Scenario[] = [
  {
    name: 'One shared API',
    messages: [
      { from: 0, to: 3, label: 'GET /products/42 → 60 fields', note: 'Over-fetching: the mobile screen needs 8 fields but gets 60, over a slow mobile network.' },
      { from: 0, to: 3, label: 'GET /reviews?product=42', note: 'Under-fetching: one endpoint is not enough, so the app makes more requests.' },
      { from: 0, to: 3, label: 'GET /stock/42', note: 'Three round trips from the phone, each paying full mobile latency.' },
      { from: 1, to: 3, label: 'GET /products/42?view=web&include=…', note: 'The web app needs a different shape, so the shared API grows flags for every client. Over time it becomes a Frankenstein that no team owns.' },
    ],
  },
  {
    name: 'BFF per client',
    messages: [
      { from: 0, to: 2, label: 'GET /mobile/product-screen/42', note: 'The mobile app asks its own BFF for exactly one screen. The frontend team usually owns this service.' },
      { from: 2, to: 3, label: 'products, reviews, stock (parallel)', note: 'The BFF fans out to the services. These calls are inside the data centre, so they are fast.' },
      { from: 3, to: 2, label: '3 responses', note: 'Auth, TLS and retries are handled once, here, not in every client.', dashed: true },
      { from: 2, to: 2, label: 'Shape for a small screen', note: 'It picks 8 fields, formats prices, and drops what the screen does not show.' },
      { from: 2, to: 0, label: 'One response, 4 KB', note: 'One round trip from the phone. The cost: an extra network hop, one more service to run, and a single point of failure.', dashed: true },
    ],
  },
  {
    name: 'GraphQL and N+1',
    messages: [
      { from: 1, to: 2, label: 'query { product { reviews { author } } }', note: 'GraphQL lets each client ask for exactly the fields it needs, so one gateway can serve every client.' },
      { from: 2, to: 3, label: 'reviews for product 42', note: 'The product resolver returns 20 reviews.' },
      { from: 2, to: 3, label: 'author 1, author 2, … author 20', note: 'The N+1 problem: the author resolver runs once per review, so 1 query becomes 21.' },
      { from: 2, to: 3, label: 'DataLoader: authors [1…20]', note: 'Fix: batch per tick with DataLoader, so the 20 lookups become one call.' },
      { from: 2, to: 1, label: 'Exactly the fields asked for', note: 'The client gets one response in the shape it asked for. The complexity moved to the server: schema design, batching, caching and query cost limits.', dashed: true },
    ],
  },
]

export const deliveryActors = ['Browser', 'CDN', 'Render server', 'CMS / database']

export const deliveryScenarios: Scenario[] = [
  {
    name: 'SSG',
    messages: [
      { from: 2, to: 1, label: 'At deploy: render all pages, upload', note: 'During the build, the framework renders every page to HTML and uploads it to the CDN.' },
      { from: 0, to: 1, label: 'GET /blog/hello', note: 'A visitor asks for a page.' },
      { from: 1, to: 0, label: 'Prebuilt HTML (edge hit)', note: 'Served from the nearest edge in milliseconds. No server runs per request.', dashed: true },
      { from: 3, to: 3, label: 'Editor changes the post', note: 'Nothing changes for visitors until someone runs the build and deploys again.' },
    ],
  },
  {
    name: 'ISR',
    messages: [
      { from: 0, to: 1, label: 'GET /products/42', note: 'The page was generated 70 seconds ago with a TTL (revalidate) of 60 seconds.' },
      { from: 1, to: 0, label: 'Cached page (stale, still served)', note: 'The visitor still gets the cached page instantly. This is stale-while-revalidate.', dashed: true },
      { from: 1, to: 2, label: 'Regenerate in the background', note: 'The expired TTL triggers one background render.' },
      { from: 2, to: 3, label: 'Fetch latest product', note: 'The render reads the current data.' },
      { from: 3, to: 2, label: 'New price', note: 'Someone changed the price in the database.', dashed: true },
      { from: 2, to: 1, label: 'Replace cached HTML', note: 'The CDN now holds the new page. The next visitor sees the update, with no full rebuild.' },
    ],
  },
  {
    name: 'SSR',
    messages: [
      { from: 0, to: 1, label: 'GET /account (with cookie)', note: 'A personal page. It cannot be shared between users, so the CDN cannot cache it.' },
      { from: 1, to: 2, label: 'Pass through (private)', note: 'Every request reaches the render server.' },
      { from: 2, to: 3, label: 'Fetch orders for this user', note: 'Data is fetched next to the database.' },
      { from: 3, to: 2, label: 'Rows', note: 'Fast hop inside the data centre.', dashed: true },
      { from: 2, to: 2, label: 'Render React to HTML (stream)', note: 'React renders on the server. The browser then downloads JS and hydrates; with server components, only interactive parts ship JS.' },
      { from: 2, to: 0, label: 'Personalised HTML', note: 'Always fresh and good for SEO, at the cost of running servers that scale with traffic.', dashed: true },
    ],
  },
]

export const federationSteps: Step[] = [
  { title: 'Load the shell', sub: 'host app', detail: 'The browser loads the shell: layout, routing, auth, theme and design tokens. It is small and owned by a platform team.' },
  { title: 'Match the route', sub: '/checkout', detail: 'The shell decides which micro frontend owns this URL.' },
  { title: 'Fetch remoteEntry.js', sub: "from checkout's CDN", detail: "With Module Federation, each team publishes a small manifest. The shell fetches the checkout team's latest one at runtime, so checkout can deploy without the shell redeploying." },
  { title: 'Share dependencies', sub: 'React as a singleton', detail: 'Shared libraries are negotiated so there is one copy of React. Without this, users download React several times and hooks break.' },
  { title: 'Mount', sub: 'into a slot', detail: "The shell mounts checkout's root component into its slot and passes the shared context: user, locale, theme." },
  { title: 'Talk through events', sub: 'typed contract', detail: 'Apps never import each other’s internals. They publish and subscribe to events such as cart:item-added, defined in a small shared package.' },
]
