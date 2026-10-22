<script setup lang="ts">
import { ref, computed } from 'vue'

// Illustrative timings in ms for one product page on a mid-range phone.
type Lane = 'Server' | 'Network' | 'Browser JS'
interface Phase { lane: Lane; start: number; end: number; label: string; tone: 'server' | 'net' | 'js' | 'hydrate' }
interface Strategy { name: string; phases: Phase[]; shell?: number; content: number; interactive: number; text: string }

const strategies: Record<string, Strategy> = {
  csr: {
    name: 'CSR',
    phases: [
      { lane: 'Network', start: 0, end: 250, label: 'empty HTML', tone: 'net' },
      { lane: 'Network', start: 250, end: 1000, label: 'JS bundle', tone: 'net' },
      { lane: 'Browser JS', start: 1000, end: 1250, label: 'run React', tone: 'js' },
      { lane: 'Network', start: 1250, end: 1750, label: 'API data', tone: 'net' },
      { lane: 'Browser JS', start: 1750, end: 1900, label: 'render', tone: 'js' },
    ],
    shell: 1250, content: 1900, interactive: 1900,
    text: 'Client-side rendering: the server sends <div id="root"></div>. Users stare at a blank screen until JS downloads, runs, and fetches data. Simple to host; slow first paint.',
  },
  ssr: {
    name: 'SSR + hydration',
    phases: [
      { lane: 'Server', start: 0, end: 450, label: 'fetch data + render', tone: 'server' },
      { lane: 'Network', start: 450, end: 650, label: 'full HTML', tone: 'net' },
      { lane: 'Network', start: 650, end: 1400, label: 'JS bundle', tone: 'net' },
      { lane: 'Browser JS', start: 1400, end: 1750, label: 'hydrate', tone: 'hydrate' },
    ],
    content: 650, interactive: 1750,
    text: 'Server-side rendering: content paints as soon as HTML arrives, but the page is inert until the same JS downloads and hydrates. The gap between paint and interactive is where rage clicks happen.',
  },
  ppr: {
    name: 'Partial prerendering',
    phases: [
      { lane: 'Network', start: 0, end: 120, label: 'static shell (CDN)', tone: 'net' },
      { lane: 'Server', start: 0, end: 500, label: 'dynamic parts', tone: 'server' },
      { lane: 'Network', start: 500, end: 620, label: 'stream holes', tone: 'net' },
      { lane: 'Network', start: 120, end: 500, label: 'JS', tone: 'net' },
      { lane: 'Browser JS', start: 620, end: 820, label: 'hydrate', tone: 'hydrate' },
    ],
    shell: 120, content: 620, interactive: 820,
    text: 'The static shell is built at deploy time and served from the CDN instantly; personalised parts (cart, prices, recommendations) stream into Suspense holes in the same response.',
  },
  rsc: {
    name: 'Server Components',
    phases: [
      { lane: 'Server', start: 0, end: 450, label: 'render server tree', tone: 'server' },
      { lane: 'Network', start: 450, end: 650, label: 'HTML + RSC payload', tone: 'net' },
      { lane: 'Network', start: 650, end: 900, label: 'client JS only', tone: 'net' },
      { lane: 'Browser JS', start: 900, end: 1020, label: 'hydrate islands', tone: 'hydrate' },
    ],
    content: 650, interactive: 1020,
    text: 'Same early paint as SSR, but components that never run on the client ship zero JS. Less to download and less to hydrate, so the page becomes interactive sooner.',
  },
}

const MAX = 2000
const lanes: Lane[] = ['Server', 'Network', 'Browser JS']
const key = ref<keyof typeof strategies>('ssr')
const t = ref(800)
const s = computed(() => strategies[key.value])

const screen = computed(() => {
  const v = s.value, now = t.value
  if (now >= v.interactive) return 'interactive'
  if (now >= v.content) return 'content'
  if (v.shell !== undefined && now >= v.shell) return 'shell'
  return 'blank'
})
const screenText: Record<string, string> = {
  blank: 'Blank white screen',
  shell: 'Shell or spinner, no real content',
  content: 'Content visible, but clicks do nothing yet',
  interactive: 'Content visible and interactive',
}
const pct = (ms: number) => (ms / MAX) * 100 + '%'
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">What the user sees, and when</div>
    <div class="cc-demo-hint">Pick a strategy and drag the time slider. Numbers are illustrative, not benchmarks.</div>

    <div class="cc-controls" role="group" aria-label="Rendering strategy">
      <button v-for="(v, k) in strategies" :key="k" class="cc-btn" :aria-pressed="key === k" @click="key = k">{{ v.name }}</button>
    </div>

    <div class="rt">
      <div class="rt-chart">
        <div v-for="lane in lanes" :key="lane" class="rt-lane">
          <span class="rt-name">{{ lane }}</span>
          <span class="rt-track">
            <span
              v-for="p in s.phases.filter((x) => x.lane === lane)"
              :key="p.label"
              class="rt-bar"
              :class="p.tone"
              :style="{ left: pct(p.start), width: pct(p.end - p.start) }"
              :title="`${p.label}: ${p.start}–${p.end} ms`"
            >{{ p.label }}</span>
            <span class="rt-now" :style="{ left: pct(t) }" />
          </span>
        </div>
        <div class="rt-lane">
          <span class="rt-name">Milestones</span>
          <span class="rt-track rt-marks">
            <span v-if="s.shell !== undefined" class="rt-mark" :style="{ left: pct(s.shell) }">FCP</span>
            <span class="rt-mark content" :style="{ left: pct(s.content) }">{{ s.shell === undefined ? 'FCP/LCP' : 'LCP' }}</span>
            <span class="rt-mark live" :style="{ left: pct(s.interactive) }">interactive</span>
            <span class="rt-now" :style="{ left: pct(t) }" />
          </span>
        </div>
        <label class="rt-slider">
          <span>{{ t }} ms</span>
          <input v-model.number="t" type="range" min="0" :max="MAX" step="10" aria-label="Time since navigation" />
        </label>
      </div>

      <div class="phone" :data-screen="screen">
        <div class="ph-bar" />
        <template v-if="screen === 'shell'">
          <div class="ph-skel" /><div class="ph-skel short" /><div class="ph-skel tall" />
        </template>
        <template v-else-if="screen !== 'blank'">
          <div class="ph-title">Trail shoes</div>
          <div class="ph-img" />
          <div class="ph-price">€89</div>
          <div class="ph-btn">{{ screen === 'interactive' ? 'Add to cart' : 'Add to cart (inert)' }}</div>
        </template>
        <div class="ph-caption">{{ screenText[screen] }}</div>
      </div>
    </div>

    <div class="cc-note">{{ s.text }}</div>
  </div>
</template>

<style scoped>
.rt {
  display: grid;
  grid-template-columns: 1fr 150px;
  gap: 14px;
  align-items: start;
}
.rt-lane {
  display: grid;
  grid-template-columns: 82px 1fr;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}
.rt-name {
  color: var(--vp-c-text-2);
}
.rt-track {
  position: relative;
  height: 24px;
  border-radius: 4px;
  background: var(--vp-c-bg);
}
.rt-bar {
  position: absolute;
  top: 2px;
  bottom: 2px;
  overflow: hidden;
  padding: 0 4px;
  border-radius: 4px;
  font-size: 10.5px;
  line-height: 20px;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--vp-c-text-1);
  transition: left 0.4s, width 0.4s;
}
.rt-bar.server { background: var(--vp-c-brand-soft); outline: 1px solid var(--vp-c-brand-1); }
.rt-bar.net { background: var(--vp-c-default-soft); outline: 1px solid var(--vp-c-text-3); }
.rt-bar.js { background: var(--vp-c-warning-soft); outline: 1px solid var(--vp-c-warning-1); }
.rt-bar.hydrate { background: var(--vp-c-danger-soft); outline: 1px solid var(--vp-c-danger-1); }
.rt-marks {
  background: none;
}

.rt-mark {
  position: absolute;
  top: 3px;
  transform: translateX(-50%);
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--vp-c-text-2);
  transition: left 0.4s;
}
.rt-marks { height: 48px; }
.rt-mark.content { top: 15px; color: var(--vp-c-brand-1); }
.rt-mark.live { top: 32px; color: var(--vp-c-success-1); }
.rt-now {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 2px;
  background: var(--vp-c-text-1);
  opacity: 0.5;
  pointer-events: none;
}
.rt-slider {
  display: grid;
  grid-template-columns: 82px 1fr;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
}
.phone {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 230px;
  padding: 10px;
  border: 2px solid var(--vp-c-text-3);
  border-radius: 18px;
  background: var(--vp-c-bg);
  font-size: 12px;
}
.ph-bar { height: 6px; width: 40%; margin: 0 auto 4px; border-radius: 3px; background: var(--vp-c-divider); }
.ph-skel { height: 14px; border-radius: 4px; background: var(--vp-c-default-soft); animation: pulse 1s infinite alternate; }
.ph-skel.short { width: 60%; }
.ph-skel.tall { height: 70px; }
@keyframes pulse { to { opacity: 0.4; } }
.ph-title { font-weight: 700; }
.ph-img { height: 70px; border-radius: 6px; background: linear-gradient(135deg, var(--vp-c-brand-soft), var(--vp-c-success-soft)); }
.ph-price { font-weight: 600; }
.ph-btn {
  padding: 4px;
  border-radius: 6px;
  text-align: center;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-3);
}
.phone[data-screen='interactive'] .ph-btn { background: var(--vp-c-brand-1); color: var(--vp-c-white); }
.ph-caption { margin-top: auto; font-size: 11px; color: var(--vp-c-text-2); text-align: center; }
@media (max-width: 600px) {
  .rt { grid-template-columns: 1fr; }
  .phone { max-width: 180px; justify-self: center; }
}
</style>
