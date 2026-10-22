<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'

const TOTAL = 10_000, ROW = 32, VIEW = 288, OVERSCAN = 4

const windowed = ref(true)
const scrollTop = ref(0)
const box = ref<HTMLElement>()
const domRows = ref(0)
const renderMs = ref<number | null>(null)

// The heart of windowing: work out which rows are visible from the scroll position.
const range = computed(() => {
  if (!windowed.value) return { start: 0, end: TOTAL }
  const start = Math.max(0, Math.floor(scrollTop.value / ROW) - OVERSCAN)
  const end = Math.min(TOTAL, Math.ceil((scrollTop.value + VIEW) / ROW) + OVERSCAN)
  return { start, end }
})
const rows = computed(() => {
  const out: number[] = []
  for (let i = range.value.start; i < range.value.end; i++) out.push(i)
  return out
})

function count() {
  domRows.value = box.value?.querySelectorAll('.wd-row').length ?? 0
}

async function setMode(w: boolean) {
  const t0 = performance.now()
  windowed.value = w
  scrollTop.value = 0
  if (box.value) box.value.scrollTop = 0
  await nextTick()
  renderMs.value = Math.round(performance.now() - t0)
  count()
}

function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
  nextTick(count)
}

onMounted(count)
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">10,000 rows</div>
    <div class="cc-demo-hint">Scroll the list, then switch modes and compare the DOM row count and render time.</div>
    <div class="cc-controls" role="group" aria-label="List mode">
      <button class="cc-btn" :aria-pressed="windowed" @click="setMode(true)">Windowed</button>
      <button class="cc-btn" :aria-pressed="!windowed" @click="setMode(false)">Render everything</button>
    </div>

    <div class="wd">
      <div ref="box" class="wd-box" :style="{ height: VIEW + 'px' }" @scroll.passive="onScroll">
        <div class="wd-spacer" :style="{ height: TOTAL * ROW + 'px' }">
          <div
            v-for="i in rows"
            :key="i"
            class="wd-row"
            :style="{ transform: `translateY(${i * ROW}px)`, height: ROW + 'px' }"
          >
            <span class="wd-avatar" :style="{ background: `hsl(${(i * 47) % 360} 55% 60%)` }" />
            Post #{{ i + 1 }}
          </div>
        </div>
      </div>

      <div class="wd-stats">
        <div><span>Items in the list</span><strong>{{ TOTAL.toLocaleString() }}</strong></div>
        <div><span>Rows in the DOM</span><strong :class="windowed ? 'ok' : 'bad'">{{ domRows.toLocaleString() }}</strong></div>
        <div><span>Visible range</span><strong>{{ range.start }}–{{ range.end - 1 }}</strong></div>
        <div><span>Last mode switch</span><strong>{{ renderMs === null ? '–' : renderMs + ' ms' }}</strong></div>
        <p class="cc-demo-hint" style="margin: 6px 0 0">A tall spacer keeps the scrollbar honest; only visible rows (plus {{ OVERSCAN }} either side) exist, positioned with <code>transform</code>.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wd {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 12px;
}
.wd-box {
  overflow-y: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.wd-spacer {
  position: relative;
}
.wd-row {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 13px;
}
.wd-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}
.wd-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.wd-stats > div {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.wd-stats span {
  color: var(--vp-c-text-2);
}
.ok {
  color: var(--vp-c-success-1);
}
.bad {
  color: var(--vp-c-danger-1);
}
@media (max-width: 560px) {
  .wd {
    grid-template-columns: 1fr;
  }
}
</style>
