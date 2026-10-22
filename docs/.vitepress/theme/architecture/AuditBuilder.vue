<script setup lang="ts">
import { reactive, computed, ref } from 'vue'

const rendering = {
  ssg: 'serve marketing and docs pages as static HTML from a CDN (SSG)',
  isr: 'regenerate catalogue pages on a TTL (ISR)',
  ssr: 'render personalised pages on the server per request (SSR)',
  rsc: 'use server components so non-interactive parts ship no JavaScript',
  csr: 'run the logged-in product as a client-rendered SPA',
} as const
const dataLayer = {
  rest: 'calls the REST APIs directly',
  bff: 'talks to a backend for frontend that our team owns',
  graphql: 'queries a GraphQL gateway in front of the microservices',
} as const
const org = {
  flat: 'folders by file type (components, hooks, utils)',
  feature: 'feature folders',
  modular: 'a modular monolith, with domain modules on a shared platform layer and boundaries enforced in CI',
  mfe: 'micro frontends, composed at runtime by a shell',
} as const
const teams = { s: '1 to 5', m: '6 to 30', l: '30 to 150', xl: 'more than 150' } as const
const pains = {
  none: 'Nothing urgent',
  load: 'Slow first load or poor SEO',
  interact: 'Slow interactions',
  regress: 'Merge conflicts and regressions',
  release: 'Teams block each other’s releases',
} as const

const s = reactive({
  rendering: new Set<keyof typeof rendering>(['csr']),
  data: 'rest' as keyof typeof dataLayer,
  org: 'feature' as keyof typeof org,
  team: 'm' as keyof typeof teams,
  pain: 'regress' as keyof typeof pains,
})

function toggleRendering(k: keyof typeof rendering) {
  s.rendering.has(k) ? s.rendering.delete(k) : s.rendering.add(k)
}

function list(items: string[]) {
  if (items.length <= 1) return items.join('')
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]
}

const nextStep = computed(() => {
  const big = s.team === 'l' || s.team === 'xl'
  switch (s.pain) {
    case 'load':
      return s.rendering.has('csr') && s.rendering.size === 1
        ? 'Move public routes to SSG or SSR so content arrives in the HTML, and keep the SPA for logged-in pages.'
        : 'Measure JavaScript per route, move non-interactive parts to server components, and lazy-load heavy views.'
    case 'interact':
      return 'This is runtime, not architecture: profile re-renders, keep state minimal, virtualise long lists and use transitions.'
    case 'regress':
      return s.org === 'modular' || s.org === 'mfe'
        ? 'Tighten what exists: enforce boundaries in CI, give each module an owner (CODEOWNERS) and build only what changed (Nx affected).'
        : 'Introduce a modular monolith: group code by domain, give each domain a public index.ts, and enforce boundaries with a lint rule.'
    case 'release':
      return s.team === 'xl'
        ? 'Split the domains that release most often into micro frontends, behind a shell, with a typed event contract.'
        : 'Try a modular monolith with trunk-based development and feature flags first. Micro frontends at this size would likely slow you down.'
    default:
      return big && s.org === 'flat'
        ? 'Nothing is on fire, but a team this size will outgrow file-type folders. Plan the move to domain modules.'
        : 'Stay where you are and write down why it fits: that reasoning is the senior answer.'
  }
})

const warnings = computed(() => {
  const w: string[] = []
  if (s.org === 'mfe' && (s.team === 's' || s.team === 'm')) w.push('Micro frontends with fewer than 30 engineers usually cost more than they save.')
  if (s.data !== 'rest' && s.team === 's') w.push('A BFF or GraphQL layer is another service for a very small team to run. Check it pays off.')
  if ((s.rendering.has('ssr') || s.rendering.has('rsc')) && s.pain === 'none' && !s.rendering.has('ssg'))
    w.push('Server rendering has running costs. Be ready to say which metric (LCP, SEO) justified it.')
  if (!s.rendering.size) w.push('Pick at least one rendering strategy.')
  return w
})

const answer = computed(() => {
  const r = list([...s.rendering].map((k) => rendering[k]))
  return `We ${r || '…'}. The frontend ${dataLayer[s.data]}. We structure the code as ${org[s.org]}, which suits our ${teams[s.team]} engineers. Our main pressure is ${pains[s.pain].toLowerCase()}, so the next step we're considering is: ${nextStep.value.charAt(0).toLowerCase() + nextStep.value.slice(1)}`
})

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(answer.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">Audit your current project</div>
    <div class="cc-demo-hint">Describe the codebase you work on today. The answer below updates as you go.</div>

    <div class="au">
      <fieldset class="au-q">
        <legend>How are pages rendered? (pick all that apply)</legend>
        <div class="cc-controls">
          <button v-for="(text, k) in rendering" :key="k" class="cc-btn" :aria-pressed="s.rendering.has(k)" @click="toggleRendering(k)">{{ { ssg: 'SSG', isr: 'ISR', ssr: 'SSR', rsc: 'Server components', csr: 'Client SPA' }[k] }}</button>
        </div>
      </fieldset>
      <fieldset class="au-q">
        <legend>How does the frontend get data?</legend>
        <div class="cc-controls">
          <button v-for="(text, k) in dataLayer" :key="k" class="cc-btn" :aria-pressed="s.data === k" @click="s.data = k">{{ { rest: 'REST directly', bff: 'BFF', graphql: 'GraphQL gateway' }[k] }}</button>
        </div>
      </fieldset>
      <fieldset class="au-q">
        <legend>How is the code organised?</legend>
        <div class="cc-controls">
          <button v-for="(text, k) in org" :key="k" class="cc-btn" :aria-pressed="s.org === k" @click="s.org = k">{{ { flat: 'By file type', feature: 'Feature folders', modular: 'Modular monolith', mfe: 'Micro frontends' }[k] }}</button>
        </div>
      </fieldset>
      <fieldset class="au-q">
        <legend>How many engineers work on the frontend?</legend>
        <div class="cc-controls">
          <button v-for="(text, k) in teams" :key="k" class="cc-btn" :aria-pressed="s.team === k" @click="s.team = k">{{ text }}</button>
        </div>
      </fieldset>
      <fieldset class="au-q">
        <legend>What hurts most?</legend>
        <div class="cc-controls">
          <button v-for="(text, k) in pains" :key="k" class="cc-btn" :aria-pressed="s.pain === k" @click="s.pain = k">{{ text }}</button>
        </div>
      </fieldset>
    </div>

    <div class="au-out">
      <div class="au-label">Your interview answer</div>
      <p class="au-answer">“{{ answer }}”</p>
      <div v-for="w in warnings" :key="w" class="au-warn">⚠ {{ w }}</div>
      <div class="cc-controls" style="margin-bottom: 0">
        <button class="cc-btn" @click="copy">{{ copied ? 'Copied' : 'Copy answer' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.au-q {
  margin: 0 0 4px;
  padding: 0;
  border: 0;
}
.au-q legend {
  font-size: 13px;
  font-weight: 600;
}
.au-q .cc-controls {
  margin: 4px 0 8px;
}
.au-out {
  margin-top: 6px;
  padding: 12px 14px;
  border: 2px solid var(--vp-c-brand-1);
  border-radius: 10px;
  background: var(--vp-c-bg);
}
.au-label {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.au-answer {
  margin: 6px 0 8px;
  font-size: 15px;
  line-height: 1.6;
}
.au-warn {
  margin-bottom: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--vp-c-warning-soft);
  font-size: 13px;
}
</style>
