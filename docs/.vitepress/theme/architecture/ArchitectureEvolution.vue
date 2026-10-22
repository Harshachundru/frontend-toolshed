<script setup lang="ts">
import { ref, computed } from 'vue'

type Dim = 'scale' | 'perf' | 'complexity' | 'team' | 'value' | 'cost'
interface Era {
  id: string
  name: string
  when: string
  summary: string
  server: string[]
  client: string[]
  scores: Record<Dim, number>
  gain: string
  pain: string
}

const dims: { key: Dim; label: string; hint: string }[] = [
  { key: 'scale', label: 'Infra scalability', hint: 'How easily it serves more traffic' },
  { key: 'perf', label: 'Performance', hint: 'Load speed and responsiveness together' },
  { key: 'complexity', label: 'Complexity', hint: 'What the team has to know and run' },
  { key: 'team', label: 'Team size it supports', hint: 'How many engineers can work in parallel' },
  { key: 'value', label: 'Product value', hint: 'How rich a product it makes possible' },
  { key: 'cost', label: 'Upfront cost', hint: 'Infrastructure, tooling and learning' },
]

// Scores are relative judgements from 1 to 5, to compare the eras with each other.
const eras: Era[] = [
  {
    id: 'static', name: 'Static pages', when: '1990s',
    summary: 'HTML and CSS files with a sprinkle of JavaScript. Like a magazine: fast to read, but you cannot interact with it.',
    server: ['Serve files'], client: ['Display'],
    scores: { scale: 5, perf: 5, complexity: 1, team: 1, value: 1, cost: 1 },
    gain: 'Fast and cheap; any CDN can serve it.', pain: 'No interactivity, no personal data.',
  },
  {
    id: 'mvc', name: 'Server MVC', when: '2000s',
    summary: 'Django, Rails, ASP.NET, PHP. A controller on the server loads the model and fills an HTML template (the view) for every request.',
    server: ['Routing', 'Business rules', 'Validation', 'Templates to HTML', 'Session and auth'], client: ['Display', 'Small scripts'],
    scores: { scale: 2, perf: 2, complexity: 2, team: 2, value: 2, cost: 2 },
    gain: 'Dynamic pages and real logic.', pain: 'Full page reload per click, front end tightly coupled to the back end, framework lock-in.',
  },
  {
    id: 'spa', name: 'Single-page app', when: '2010s',
    summary: 'React, Vue or Angular in the browser; the server becomes a JSON API. The frontend engineer role appears.',
    server: ['Data API', 'Business rules', 'Auth'], client: ['Routing', 'Rendering', 'State', 'Validation (UX)', 'Some business rules'],
    scores: { scale: 4, perf: 3, complexity: 3, team: 3, value: 3, cost: 3 },
    gain: 'Rich interactivity without reloads; assets scale on a CDN.', pain: 'Large JS bundles, blank first screen, weak SEO.',
  },
  {
    id: 'bff', name: 'Backend for frontend', when: 'mid 2010s',
    summary: 'Each client (web, mobile) gets its own thin backend, often GraphQL, that shapes and aggregates data from many microservices.',
    server: ['Microservices', 'BFF: aggregation, auth, shaping'], client: ['Routing', 'Rendering', 'State', 'Validation (UX)'],
    scores: { scale: 4, perf: 3, complexity: 4, team: 4, value: 4, cost: 4 },
    gain: 'Tailored endpoints, faster iteration, auth done once.', pain: 'Extra network hop, another service to run, single point of failure.',
  },
  {
    id: 'ssg', name: 'SSG and ISR', when: 'late 2010s',
    summary: 'Modern frameworks render pages at build time (SSG) or regenerate them after a TTL (ISR), then serve them from a CDN.',
    server: ['Build or regenerate HTML', 'Content store'], client: ['Display', 'Islands of interactivity'],
    scores: { scale: 5, perf: 5, complexity: 3, team: 3, value: 3, cost: 2 },
    gain: 'Very fast and cheap, good SEO.', pain: 'Content is only as fresh as the last build or TTL; little personalisation.',
  },
  {
    id: 'ssr', name: 'SSR and server components', when: '2020s',
    summary: 'Next.js, Nuxt, React Router. Render per request on the server, hydrate on the client, and ship JS only for interactive components.',
    server: ['Routing', 'Data fetching', 'Rendering', 'Server components'], client: ['Hydration', 'Client components', 'State'],
    scores: { scale: 3, perf: 5, complexity: 5, team: 3, value: 4, cost: 4 },
    gain: 'Best known load performance and SEO with full interactivity.', pain: 'Servers to run, steep learning curve, framework-driven upgrades.',
  },
  {
    id: 'modular', name: 'Modular monolith', when: 'any time',
    summary: 'One deployable frontend split into domain modules (user, payments) on top of a platform layer, with enforced boundaries.',
    server: ['Unchanged'], client: ['Platform: design system, auth, data', 'Domain modules'],
    scores: { scale: 4, perf: 3, complexity: 3, team: 4, value: 4, cost: 3 },
    gain: 'Order in a large codebase; many teams in one repo.', pain: 'Boundaries erode without tooling; long builds; one release train.',
  },
  {
    id: 'mfe', name: 'Micro frontends', when: 'large orgs',
    summary: 'Domains become separately deployed apps, composed at runtime by a shell. Each team owns a vertical slice, often front to back.',
    server: ['Per-team BFFs and services'], client: ['Shell: layout, auth, shared state', 'Independent apps per team'],
    scores: { scale: 5, perf: 2, complexity: 5, team: 5, value: 5, cost: 5 },
    gain: 'Hundreds of engineers ship independently.', pain: 'Slower page loads, duplicated deps, hard cross-app consistency.',
  },
]

const selected = ref('spa')
const compare = ref<string | null>('mvc')
const era = computed(() => eras.find((e) => e.id === selected.value)!)
const other = computed(() => eras.find((e) => e.id === compare.value) ?? null)
const thickness = computed(() => {
  const e = era.value
  return Math.round((e.client.length / (e.client.length + e.server.length)) * 100)
})

function pick(id: string) {
  if (id === selected.value) return
  compare.value = selected.value
  selected.value = id
}
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">Thirty years of frontend architecture</div>
    <div class="cc-demo-hint">Click an era. The previous one stays in the chart for comparison.</div>

    <ol class="ev-line">
      <li v-for="e in eras" :key="e.id">
        <button
          class="ev-era"
          :class="{ on: e.id === selected, prev: e.id === compare }"
          :aria-pressed="e.id === selected"
          @click="pick(e.id)"
        >
          <span class="ev-dot" />
          <strong>{{ e.name }}</strong>
          <small>{{ e.when }}</small>
        </button>
      </li>
    </ol>

    <div class="ev-body">
      <div>
        <div class="cc-note">
          <strong>{{ era.name }}.</strong> {{ era.summary }}
          <div class="ev-gp"><span>Gain:</span> {{ era.gain }}</div>
          <div class="ev-gp"><span>Pain:</span> {{ era.pain }}</div>
        </div>

        <div class="ev-sub">Where the logic lives</div>
        <div class="ev-split">
          <div class="ev-side">
            <div class="ev-side-head">Server</div>
            <span v-for="s in era.server" :key="s" class="ev-chip">{{ s }}</span>
          </div>
          <div class="ev-side">
            <div class="ev-side-head">Browser</div>
            <span v-for="c in era.client" :key="c" class="ev-chip client">{{ c }}</span>
          </div>
        </div>
        <div class="ev-thick">
          <span>thin client</span>
          <span class="ev-thick-track"><span class="ev-thick-mark" :style="{ left: thickness + '%' }" /></span>
          <span>thick client</span>
        </div>
      </div>

      <div>
        <div class="ev-sub">Trade-offs (1 low, 5 high)</div>
        <div class="ev-legend">
          <span><i class="sw a" />{{ era.name }}</span>
          <span v-if="other"><i class="sw b" />{{ other.name }}</span>
        </div>
        <div v-for="d in dims" :key="d.key" class="ev-dim" :title="d.hint">
          <div class="ev-dim-label">{{ d.label }}</div>
          <div class="ev-bars">
            <div class="ev-bar a" :style="{ width: era.scores[d.key] * 18 + '%' }">
              <span>{{ era.scores[d.key] }}</span>
            </div>
            <div v-if="other" class="ev-bar b" :style="{ width: other.scores[d.key] * 18 + '%' }">
              <span>{{ other.scores[d.key] }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ev-line {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  list-style: none;
  padding: 0 0 6px !important;
  margin: 6px 0 12px !important;
}
.ev-line li {
  flex: 1 0 68px;
  margin: 0 !important;
}
.ev-era {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 18px 4px 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: none;
  font-size: 11.5px;
  line-height: 1.3;
  text-align: center;
  cursor: pointer;
}
.ev-era::before {
  content: '';
  position: absolute;
  top: 9px;
  left: 0;
  right: 0;
  border-top: 2px solid var(--vp-c-divider);
}
.ev-dot {
  position: absolute;
  top: 4px;
  width: 12px;
  height: 12px;
  border: 2px solid var(--vp-c-text-3);
  border-radius: 50%;
  background: var(--vp-c-bg);
}
.ev-era small {
  color: var(--vp-c-text-3);
}
.ev-era.prev .ev-dot {
  border-color: var(--vp-c-text-2);
  background: var(--vp-c-text-3);
}
.ev-era.on {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.ev-era.on .ev-dot {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
}
.ev-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.ev-gp {
  margin-top: 4px;
  font-size: 13px;
}
.ev-gp span {
  font-weight: 600;
}
.ev-sub {
  margin: 12px 0 6px;
  font-size: 13px;
  font-weight: 600;
}
.ev-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ev-side {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 4px;
  min-height: 80px;
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.ev-side-head {
  width: 100%;
  font-size: 11.5px;
  color: var(--vp-c-text-2);
}
.ev-chip {
  padding: 1px 7px;
  border-radius: 10px;
  background: var(--vp-c-default-soft);
  font-size: 11.5px;
  animation: pop 0.25s ease-out;
}
.ev-chip.client {
  background: var(--vp-c-brand-soft);
}
@keyframes pop {
  from { opacity: 0; transform: scale(0.9); }
}
.ev-thick {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 11.5px;
  color: var(--vp-c-text-2);
}
.ev-thick-track {
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--vp-c-default-soft), var(--vp-c-brand-soft));
}
.ev-thick-mark {
  position: absolute;
  top: -5px;
  width: 16px;
  height: 16px;
  margin-left: -8px;
  border: 2px solid var(--vp-c-bg);
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  transition: left 0.4s;
}
.ev-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}
.sw {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 4px;
  border-radius: 2px;
}
.sw.a,
.ev-bar.a {
  background: var(--vp-c-brand-1);
}
.sw.b,
.ev-bar.b {
  background: var(--vp-c-text-3);
}
.ev-dim {
  margin-bottom: 8px;
}
.ev-dim-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
}
.ev-bars {
  display: grid;
  gap: 2px;
}
.ev-bar {
  position: relative;
  height: 10px;
  border-radius: 0 4px 4px 0;
  transition: width 0.45s;
}
.ev-bar span {
  position: absolute;
  right: -16px;
  top: -3px;
  font-size: 11px;
  color: var(--vp-c-text-2);
}
@media (max-width: 640px) {
  .ev-body {
    grid-template-columns: 1fr;
  }
}
</style>
