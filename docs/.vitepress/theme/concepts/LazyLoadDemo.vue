<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const COUNT = 12
const lazy = ref(true)
const loaded = ref<boolean[]>(Array(COUNT).fill(false))
const log = ref<string[]>([])
const scroller = ref<HTMLElement>()
const cards = ref<HTMLElement[]>([])
let io: IntersectionObserver | undefined

function request(i: number) {
  if (loaded.value[i]) return
  loaded.value[i] = true
  log.value.unshift(`GET /img/photo-${i + 1}.avif`)
}

async function reset() {
  io?.disconnect()
  loaded.value = Array(COUNT).fill(false)
  log.value = []
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = 0
  if (!lazy.value) {
    for (let i = 0; i < COUNT; i++) request(i)
    return
  }
  // Start loading a little before a card scrolls into view.
  io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return
      request(Number((e.target as HTMLElement).dataset.i))
      io?.unobserve(e.target)
    }),
    { root: scroller.value, rootMargin: '0px 0px 60px 0px' },
  )
  cards.value.forEach((el) => io!.observe(el))
}

onMounted(reset)
onBeforeUnmount(() => io?.disconnect())

// A real dynamic import: the chunk is fetched the first time you click, then reused.
const modal = ref('')
const chunkState = ref<'idle' | 'loading' | 'cached'>('idle')
async function openModal() {
  const first = chunkState.value === 'idle'
  if (first) chunkState.value = 'loading'
  const t0 = performance.now()
  const { openModal } = await import('./lazy-chunk')
  const ms = Math.round(performance.now() - t0)
  chunkState.value = 'cached'
  modal.value = `${openModal()} ${first ? `Fetched in ${ms} ms.` : 'Second time: already in memory, no request.'}`
}
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">Images: eager or lazy</div>
    <div class="cc-demo-hint">Scroll the gallery and watch the request log.</div>
    <div class="cc-controls" role="group" aria-label="Loading mode">
      <button class="cc-btn" :aria-pressed="!lazy" @click="lazy = false; reset()">Eager: load all</button>
      <button class="cc-btn" :aria-pressed="lazy" @click="lazy = true; reset()">Lazy: load near the viewport</button>
    </div>

    <div class="lazy-grid">
      <div ref="scroller" class="gallery">
        <div
          v-for="i in COUNT"
          :key="i"
          ref="cards"
          :data-i="i - 1"
          class="photo"
          :class="{ 'is-loaded': loaded[i - 1] }"
        >
          <span>{{ loaded[i - 1] ? `photo-${i}.avif` : 'placeholder' }}</span>
        </div>
      </div>
      <div class="netlog">
        <div class="netlog-head">Network: {{ loaded.filter(Boolean).length }} of {{ COUNT }} requested</div>
        <div v-for="(l, i) in log" :key="l" class="netlog-row" :class="{ fresh: i === 0 }">{{ l }}</div>
      </div>
    </div>

    <div class="cc-demo-title" style="margin-top: 16px">Code: a dynamic import</div>
    <div class="cc-controls">
      <button class="cc-btn" @click="openModal">{{ chunkState === 'loading' ? 'Loading chunk…' : 'Open modal' }}</button>
    </div>
    <div class="cc-note">
      <code>const { openModal } = await import('./lazy-chunk')</code>
      <div style="margin-top: 4px">{{ modal || 'The modal code is not in this page\'s bundle yet. Open DevTools → Network, then click.' }}</div>
    </div>
  </div>
</template>

<style scoped>
.lazy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.gallery {
  height: 240px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.photo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-3);
  font-size: 12px;
  transition: background 0.4s, color 0.4s;
}
.photo.is-loaded {
  background: linear-gradient(135deg, var(--vp-c-brand-soft), var(--vp-c-success-soft));
  color: var(--vp-c-text-1);
}
.netlog {
  height: 240px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}
.netlog-head {
  margin-bottom: 6px;
  font-family: var(--vp-font-family-base);
  font-weight: 600;
}
.netlog-row {
  padding: 2px 0;
  color: var(--vp-c-text-2);
}
.netlog-row.fresh {
  color: var(--vp-c-brand-1);
}
@media (max-width: 560px) {
  .lazy-grid {
    grid-template-columns: 1fr;
  }
  .netlog {
    height: 140px;
  }
}
</style>
