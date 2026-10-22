<script setup lang="ts">
import { reactive, computed } from 'vue'

const a = reactive({
  change: 'deploy' as 'deploy' | 'hourly' | 'request',
  personal: false,
  seo: true,
  interactive: 'reading' as 'reading' | 'widgets' | 'app',
})

const questions = [
  { key: 'change', label: 'How often does the content change?', options: [['deploy', 'Only when we deploy'], ['hourly', 'Hourly or daily'], ['request', 'On every request']] },
  { key: 'personal', label: 'Is the page different for each user?', options: [[false, 'No, same for everyone'], [true, 'Yes, personalised']] },
  { key: 'seo', label: 'Do search engines or first-time visitors matter?', options: [[true, 'Yes, public page'], [false, 'No, behind a login']] },
  { key: 'interactive', label: 'How interactive is it?', options: [['reading', 'Mostly reading'], ['widgets', 'Some widgets'], ['app', 'App-like (editor, dashboard)']] },
] as const

const result = computed(() => {
  if (!a.seo && a.interactive === 'app')
    return { name: 'Client-side SPA', tool: 'Vite + React Router, TanStack Query', why: 'Behind a login, SEO does not matter and users return often, so cached JS makes repeat visits fast. Static hosting is cheap and simple.' }
  if (a.personal && a.seo)
    return { name: 'SSR with server components (or partial prerendering)', tool: 'Next.js App Router, React Router framework mode', why: 'Public and personalised: render per request so content and SEO arrive in the HTML. If most of the page is shared, prerender that as a static shell and stream the personal parts.' }
  if (a.personal || a.change === 'request')
    return { name: 'Server-side rendering', tool: 'Next.js dynamic routes, React Router loaders, TanStack Start', why: 'The HTML must reflect data at request time, so it cannot be built ahead. Cache what you can at the CDN with short TTLs.' }
  if (a.change === 'hourly')
    return { name: 'Incremental static regeneration (ISR)', tool: 'Next.js `revalidate`, Nuxt route rules, Astro + CDN cache', why: 'Served static from the CDN, then regenerated in the background once the TTL expires. Fresh enough for catalogues and blogs without a server render per request.' }
  return { name: 'Static site generation (SSG)', tool: 'Astro, VitePress, Next.js static export', why: 'Content changes only on deploy, so build every page once and serve it from a CDN. Fastest and cheapest option; this guide is built this way.' }
})

const islands = computed(() =>
  a.interactive === 'reading' ? '' : a.interactive === 'widgets'
    ? 'Ship JS only for the widgets: client components or islands.'
    : 'Expect a larger client bundle; split it by route and lazy-load heavy views.')
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">Pick a rendering strategy for one route</div>
    <div class="cc-demo-hint">Answer per route, not per app. Most real products mix strategies.</div>

    <div class="rp">
      <div class="rp-qs">
        <fieldset v-for="q in questions" :key="q.key" class="rp-q">
          <legend>{{ q.label }}</legend>
          <div class="cc-controls" style="margin: 4px 0 0">
            <button
              v-for="[val, text] in q.options"
              :key="String(val)"
              class="cc-btn"
              :aria-pressed="(a as any)[q.key] === val"
              @click="(a as any)[q.key] = val"
            >{{ text }}</button>
          </div>
        </fieldset>
      </div>

      <div class="rp-out">
        <div class="rp-label">Recommendation</div>
        <div class="rp-name">{{ result.name }}</div>
        <p>{{ result.why }}</p>
        <p v-if="islands">{{ islands }}</p>
        <div class="rp-label">Typical tools</div>
        <p>{{ result.tool.replace(/`/g, '') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rp {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 14px;
}
.rp-q {
  margin: 0 0 10px;
  padding: 0;
  border: 0;
}
.rp-q legend {
  font-size: 13px;
  font-weight: 600;
}
.rp-out {
  padding: 12px 14px;
  border: 2px solid var(--vp-c-brand-1);
  border-radius: 10px;
  background: var(--vp-c-bg);
  font-size: 13.5px;
}
.rp-out p {
  margin: 6px 0 10px;
  line-height: 1.55;
}
.rp-label {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.rp-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
@media (max-width: 640px) {
  .rp {
    grid-template-columns: 1fr;
  }
}
</style>
