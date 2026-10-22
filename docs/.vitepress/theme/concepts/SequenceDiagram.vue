<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import type { Scenario } from './types'

const props = defineProps<{ title: string; hint?: string; actors: string[]; scenarios: Scenario[] }>()

// Geometry: actor headers on top, one row per message below.
const W = 720, top = 24, headH = 34, firstRow = 92, rowH = 46, margin = 80
const id = computed(() => 'seq-' + props.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
const xs = computed(() => {
  const n = props.actors.length
  return props.actors.map((_, i) => (n === 1 ? W / 2 : margin + (i * (W - 2 * margin)) / (n - 1)))
})

const scenario = ref(0)
const step = ref(1)
const playing = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

const messages = computed(() => props.scenarios[scenario.value].messages)
const height = computed(() => firstRow + messages.value.length * rowH)
const currentNote = computed(() => messages.value[step.value - 1]?.note ?? '')

function rowY(i: number) {
  return firstRow + i * rowH + 10
}

function arrowPath(from: number, to: number, y: number) {
  const a = xs.value[from], b = xs.value[to]
  if (from === to) return a > W / 2 ? `M${a} ${y - 8}h-44v16h40` : `M${a} ${y - 8}h44v16h-40`
  const pad = b > a ? -4 : 4
  return `M${a} ${y}H${b + pad}`
}

function labelX(from: number, to: number) {
  if (from !== to) return (xs.value[from] + xs.value[to]) / 2
  return xs.value[from] > W / 2 ? xs.value[from] - 52 : xs.value[from] + 52
}

function anchor(from: number, to: number) {
  if (from !== to) return 'middle'
  return xs.value[from] > W / 2 ? 'end' : 'start'
}

function pick(i: number) {
  stop()
  scenario.value = i
  step.value = 1
}

function stop() {
  playing.value = false
  clearInterval(timer)
}

function move(d: number) {
  stop()
  step.value = Math.min(messages.value.length, Math.max(1, step.value + d))
}

function play() {
  if (playing.value) return stop()
  if (step.value >= messages.value.length) step.value = 1
  playing.value = true
  timer = setInterval(() => {
    if (step.value >= messages.value.length) stop()
    else step.value++
  }, 1600)
}

onBeforeUnmount(stop)
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">{{ title }}</div>
    <div v-if="hint" class="cc-demo-hint">{{ hint }}</div>

    <div class="cc-controls" role="group" aria-label="Scenario">
      <button
        v-for="(s, i) in scenarios"
        :key="s.name"
        class="cc-btn"
        :aria-pressed="i === scenario"
        @click="pick(i)"
      >{{ s.name }}</button>
    </div>

    <svg class="cc-svg" :viewBox="`0 0 ${W} ${height}`" role="img" :aria-label="title" font-size="12.5">
      <defs>
        <marker :id="`${id}-a`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" class="cc-fill-edge" />
        </marker>
        <marker :id="`${id}-b`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" class="cc-fill-brand" />
        </marker>
      </defs>

      <g v-for="(a, i) in actors" :key="a">
        <line :x1="xs[i]" :x2="xs[i]" :y1="top + headH" :y2="height - 4" class="cc-stroke-faint" stroke-dasharray="3 4" />
        <rect :x="xs[i] - 66" :y="top" width="132" :height="headH" rx="7" class="cc-box" />
        <text :x="xs[i]" :y="top + 22" text-anchor="middle" font-weight="600" class="cc-ink">{{ a }}</text>
      </g>

      <g
        v-for="(m, i) in messages"
        :key="scenario + '-' + i"
        class="seq-msg"
        :class="{ 'is-hidden': i >= step, 'is-current': i === step - 1 }"
      >
        <path
          :d="arrowPath(m.from, m.to, rowY(i))"
          fill="none"
          :stroke-width="i === step - 1 ? 2 : 1.25"
          :stroke-dasharray="m.dashed ? '5 4' : undefined"
          :class="i === step - 1 ? 'cc-stroke-brand' : 'cc-stroke-edge'"
          :marker-end="`url(#${id}-${i === step - 1 ? 'b' : 'a'})`"
        />
        <text
          :x="labelX(m.from, m.to)"
          :y="m.from === m.to ? rowY(i) + 4 : rowY(i) - 7"
          :text-anchor="anchor(m.from, m.to)"
          class="cc-ink"
        >{{ m.label }}</text>
      </g>
    </svg>

    <div class="cc-note" aria-live="polite">
      <strong>Step {{ step }} of {{ messages.length }}.</strong> {{ currentNote }}
    </div>

    <div class="cc-controls">
      <button class="cc-btn" @click="move(-1)">← Back</button>
      <button class="cc-btn" :aria-pressed="playing" @click="play">{{ playing ? 'Pause' : 'Play' }}</button>
      <button class="cc-btn" @click="move(1)">Next →</button>
      <button class="cc-btn" @click="stop(); step = messages.length">Show all</button>
    </div>
  </div>
</template>

<style scoped>
.seq-msg {
  transition: opacity 0.35s;
}
.seq-msg.is-hidden {
  opacity: 0.1;
}
.seq-msg.is-current text {
  font-weight: 600;
}
</style>
