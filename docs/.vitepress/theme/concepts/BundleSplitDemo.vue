<script setup lang="ts">
import { ref, computed } from 'vue'

// Sizes are compressed KB for a typical mid-sized React app; they are illustrative.
const chunks = {
  vendor: { file: 'vendor.[hash].js', kb: 150, what: 'react, react-dom, react-router' },
  shared: { file: 'shared.[hash].js', kb: 20, what: 'design system, utils' },
  login: { file: 'login.[hash].js', kb: 30, what: 'login form, validation' },
  home: { file: 'home.[hash].js', kb: 45, what: 'feed, cards' },
  dashboard: { file: 'dashboard.[hash].js', kb: 210, what: 'charts library, tables' },
  settings: { file: 'settings.[hash].js', kb: 25, what: 'forms' },
}
type Chunk = keyof typeof chunks
const routes = ['login', 'home', 'dashboard', 'settings'] as const
type Route = (typeof routes)[number]

const split = ref(true)
const route = ref<Route | null>(null)
const cache = ref(new Set<string>())
const requests = ref<{ file: string; kb: number; cached: boolean }[]>([])

const total = Object.values(chunks).reduce((s, c) => s + c.kb, 0)

function visit(r: Route) {
  route.value = r
  const files = split.value
    ? (['vendor', 'shared', r] as Chunk[]).map((c) => ({ file: chunks[c].file, kb: chunks[c].kb }))
    : [{ file: 'main.[hash].js', kb: total }]
  requests.value = files.map((f) => ({ ...f, cached: cache.value.has(f.file) }))
  files.forEach((f) => cache.value.add(f.file))
}

function setMode(s: boolean) {
  split.value = s
  reset()
}

function reset() {
  cache.value = new Set()
  requests.value = []
  route.value = null
}

const downloaded = computed(() => requests.value.filter((r) => !r.cached).reduce((s, r) => s + r.kb, 0))
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">One bundle or one chunk per route</div>
    <div class="cc-demo-hint">Pick a mode, then move between routes. Chunks you already have come from the HTTP cache.</div>

    <div class="cc-controls" role="group" aria-label="Bundling mode">
      <button class="cc-btn" :aria-pressed="!split" @click="setMode(false)">Single bundle</button>
      <button class="cc-btn" :aria-pressed="split" @click="setMode(true)">Split by route</button>
      <button class="cc-btn" @click="reset">Clear cache</button>
    </div>

    <div class="bs-modules">
      <div v-for="(c, k) in chunks" :key="k" class="bs-mod" :class="{ dim: split && route && !['vendor', 'shared', route].includes(k) }">
        <strong>{{ k }}</strong> <span>{{ c.kb }} KB</span>
        <small>{{ c.what }}</small>
      </div>
    </div>

    <div class="cc-controls" role="group" aria-label="Route">
      <span class="cc-demo-hint" style="margin: 0; align-self: center">Go to:</span>
      <button v-for="r in routes" :key="r" class="cc-btn" :aria-pressed="route === r" @click="visit(r)">/{{ r }}</button>
    </div>

    <div v-if="route" class="bs-result">
      <div v-for="r in requests" :key="r.file" class="bs-req">
        <code>{{ r.file }}</code>
        <span class="bs-bar" :style="{ width: (r.kb / total) * 100 + '%' }" :class="{ cached: r.cached }" />
        <span>{{ r.cached ? 'from cache' : r.kb + ' KB' }}</span>
      </div>
      <div class="cc-note">
        Downloaded for <strong>/{{ route }}</strong>: <strong>{{ downloaded }} KB</strong>.
        <template v-if="!split">Every route pays for the dashboard's chart library on first load, and any code change invalidates the whole file.</template>
        <template v-else>Only this route's code plus shared chunks. A change to the dashboard leaves the vendor chunk cached.</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bs-modules {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}
.bs-mod {
  padding: 8px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 13px;
  transition: opacity 0.3s;
}
.bs-mod span {
  float: right;
  color: var(--vp-c-text-2);
}
.bs-mod small {
  display: block;
  color: var(--vp-c-text-3);
}
.bs-mod.dim {
  opacity: 0.35;
}
.bs-result {
  display: grid;
  gap: 6px;
}
.bs-req {
  display: grid;
  grid-template-columns: minmax(150px, 190px) 1fr 80px;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
}
.bs-bar {
  height: 12px;
  border-radius: 4px;
  background: var(--vp-c-brand-1);
  transition: width 0.4s;
}
.bs-bar.cached {
  background: var(--vp-c-success-soft);
}
@media (max-width: 520px) {
  .bs-req {
    grid-template-columns: 1fr 70px;
  }
  .bs-bar {
    display: none;
  }
}
</style>
