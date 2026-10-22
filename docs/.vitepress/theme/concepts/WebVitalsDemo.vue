<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'

type Key = 'lcp' | 'inp' | 'cls'
const metrics: Record<Key, { name: string; what: string; good: number; poor: number; max: number; unit: string }> = {
  lcp: { name: 'LCP', what: 'Largest Contentful Paint: when the main content appears', good: 2500, poor: 4000, max: 6000, unit: 'ms' },
  inp: { name: 'INP', what: 'Interaction to Next Paint: click to visible response', good: 200, poor: 500, max: 800, unit: 'ms' },
  cls: { name: 'CLS', what: 'Cumulative Layout Shift: how much content jumps', good: 0.1, poor: 0.25, max: 0.5, unit: '' },
}

const values = ref<Record<Key, number | null>>({ lcp: null, inp: null, cls: null })
const supported = ref({ lcp: true, cls: true })

function rating(k: Key) {
  const v = values.value[k]
  if (v === null) return ''
  const m = metrics[k]
  return v <= m.good ? 'good' : v <= m.poor ? 'needs work' : 'poor'
}
function format(k: Key) {
  const v = values.value[k]
  if (v === null) return '–'
  return k === 'cls' ? v.toFixed(3) : Math.round(v) + ' ms'
}
const pct = (k: Key, v: number) => Math.min(100, (v / metrics[k].max) * 100) + '%'

// Real measurements of this page, where the browser supports the APIs (Chromium, and Firefox for LCP).
const observers: PerformanceObserver[] = []
function observe(type: string, cb: (e: any) => void) {
  try {
    const po = new PerformanceObserver((list) => list.getEntries().forEach(cb))
    po.observe({ type, buffered: true })
    observers.push(po)
    return true
  } catch {
    return false
  }
}

onMounted(() => {
  supported.value.lcp = observe('largest-contentful-paint', (e) => (values.value.lcp = e.startTime))
  supported.value.cls = observe('layout-shift', (e) => {
    // Shifts within 500 ms of user input are expected, so they do not count.
    if (!e.hadRecentInput) values.value.cls = (values.value.cls ?? 0) + e.value
  })
  if (supported.value.cls && values.value.cls === null) values.value.cls = 0
})
onBeforeUnmount(() => observers.forEach((o) => o.disconnect()))

// INP: block the main thread in the click handler, then time until the next frame is painted.
const work = ref(0)
const clicks = ref(0)
function slowClick(ev: MouseEvent) {
  const end = performance.now() + work.value
  while (performance.now() < end) { /* busy: simulates a heavy re-render */ }
  clicks.value++
  requestAnimationFrame(() => setTimeout(() => {
    const d = performance.now() - ev.timeStamp
    values.value.inp = Math.max(values.value.inp ?? 0, d)
  }))
}

// CLS: insert a banner a second after the click, so the shift is not excused as user-initiated.
const banner = ref(false)
const reserve = ref(false)
let bannerTimer: ReturnType<typeof setTimeout> | undefined
function lateBanner() {
  banner.value = false
  clearTimeout(bannerTimer)
  bannerTimer = setTimeout(() => nextTick(() => (banner.value = true)), 1000)
}
onBeforeUnmount(() => clearTimeout(bannerTimer))

const keys = computed(() => Object.keys(metrics) as Key[])
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">Measure this page</div>
    <div class="cc-demo-hint">LCP and CLS come from the browser's own Performance APIs for the page you are reading. INP comes from the button below.</div>

    <div class="vitals">
      <div v-for="k in keys" :key="k" class="vital" :data-rating="rating(k)">
        <div class="vital-head">
          <strong>{{ metrics[k].name }}</strong>
          <span class="vital-value">{{ format(k) }}</span>
        </div>
        <div class="vital-what">{{ metrics[k].what }}</div>
        <div class="gauge" aria-hidden="true">
          <span class="z z-good" :style="{ width: pct(k, metrics[k].good) }" />
          <span class="z z-mid" :style="{ width: `calc(${pct(k, metrics[k].poor)} - ${pct(k, metrics[k].good)})` }" />
          <span class="z z-poor" />
          <span v-if="values[k] !== null" class="needle" :style="{ left: pct(k, values[k]!) }" />
        </div>
        <div class="vital-foot">
          Good ≤ {{ metrics[k].good }}{{ metrics[k].unit }} · Poor &gt; {{ metrics[k].poor }}{{ metrics[k].unit }}
          <span v-if="rating(k)" class="badge">{{ rating(k) }}</span>
          <span v-else-if="(k === 'lcp' && !supported.lcp) || (k === 'cls' && !supported.cls)" class="badge">not supported in this browser</span>
        </div>
      </div>
    </div>

    <div class="tests">
      <div class="test">
        <div class="cc-demo-title">Try INP</div>
        <label class="cc-demo-hint">
          Work done in the click handler:
          <select v-model.number="work" class="cc-select">
            <option :value="0">none</option>
            <option :value="150">150 ms</option>
            <option :value="350">350 ms</option>
            <option :value="700">700 ms</option>
          </select>
        </label>
        <div class="cc-controls">
          <button class="cc-btn" @click="slowClick">Click me ({{ clicks }})</button>
          <button class="cc-btn" @click="values.inp = null">Reset</button>
        </div>
        <div class="cc-demo-hint">INP reports roughly the worst interaction on the page. Fix: do less per click, split work with <code>useTransition</code> or <code>scheduler.yield()</code>.</div>
      </div>

      <div class="test">
        <div class="cc-demo-title">Try CLS</div>
        <label class="cc-demo-hint"><input v-model="reserve" type="checkbox" /> Reserve space for the banner</label>
        <div class="cc-controls">
          <button class="cc-btn" @click="lateBanner">Load a late banner</button>
        </div>
        <div class="shift-box">
          <div class="slot" :class="{ reserved: reserve }">
            <div v-if="banner" class="late-banner">Sale ends tonight!</div>
          </div>
          <div class="article">Article text the reader was in the middle of…</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vitals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}
.vital {
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  --tone: var(--vp-c-text-3);
}
.vital[data-rating='good'] { --tone: var(--vp-c-success-1); }
.vital[data-rating='needs work'] { --tone: var(--vp-c-warning-1); }
.vital[data-rating='poor'] { --tone: var(--vp-c-danger-1); }
.vital-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.vital-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--tone);
}
.vital-what,
.vital-foot {
  font-size: 12px;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}
.gauge {
  position: relative;
  display: flex;
  height: 8px;
  margin: 10px 0 6px;
  border-radius: 4px;
  overflow: visible;
}
.z { height: 100%; }
.z-good { background: var(--vp-c-success-soft); border-radius: 4px 0 0 4px; }
.z-mid { background: var(--vp-c-warning-soft); }
.z-poor { flex: 1; background: var(--vp-c-danger-soft); border-radius: 0 4px 4px 0; }
.needle {
  position: absolute;
  top: -4px;
  width: 4px;
  height: 16px;
  margin-left: -2px;
  border-radius: 2px;
  background: var(--tone);
  transition: left 0.4s;
}
.badge {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--vp-c-default-soft);
  color: var(--tone);
  font-weight: 600;
}
.tests {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.shift-box {
  height: 110px;
  padding: 8px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  overflow: hidden;
  font-size: 13px;
}
.slot.reserved {
  min-height: 40px;
}
.late-banner {
  height: 40px;
  line-height: 40px;
  text-align: center;
  border-radius: 6px;
  background: var(--vp-c-warning-soft);
  font-weight: 600;
}
.article {
  padding: 8px 0;
}
</style>
