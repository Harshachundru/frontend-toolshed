<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import type { Step } from './types'

const props = defineProps<{ title: string; hint?: string; steps: Step[] }>()

const current = ref(0)
const playing = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

function go(i: number) {
  const n = props.steps.length
  current.value = (i + n) % n
}

function stop() {
  playing.value = false
  clearInterval(timer)
}

function play() {
  if (playing.value) return stop()
  if (current.value === props.steps.length - 1) current.value = 0
  playing.value = true
  timer = setInterval(() => {
    if (current.value >= props.steps.length - 1) stop()
    else current.value++
  }, 1800)
}

onBeforeUnmount(stop)
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">{{ title }}</div>
    <div v-if="hint" class="cc-demo-hint">{{ hint }}</div>

    <ol class="flow">
      <li v-for="(s, i) in steps" :key="s.title">
        <button
          class="flow-box"
          :class="{ 'is-current': i === current, 'is-done': i < current }"
          @click="stop(); go(i)"
        >
          <span class="flow-n">{{ i + 1 }}</span>
          <span class="flow-title">{{ s.title }}</span>
          <span v-if="s.sub" class="flow-sub">{{ s.sub }}</span>
        </button>
        <span v-if="i < steps.length - 1" class="flow-arrow" aria-hidden="true">→</span>
      </li>
    </ol>

    <div class="cc-note" aria-live="polite">
      <strong>{{ current + 1 }}. {{ steps[current].title }}.</strong> {{ steps[current].detail }}
    </div>

    <div class="cc-controls">
      <button class="cc-btn" @click="stop(); go(current - 1)">← Back</button>
      <button class="cc-btn" :aria-pressed="playing" @click="play">{{ playing ? 'Pause' : 'Play' }}</button>
      <button class="cc-btn" @click="stop(); go(current + 1)">Next →</button>
    </div>
  </div>
</template>

<style scoped>
.flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  list-style: none;
  padding: 0 !important;
  margin: 8px 0 14px !important;
}
.flow li {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 !important;
}
.flow-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 112px;
  max-width: 170px;
  padding: 8px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.flow-box.is-done {
  border-color: var(--vp-c-brand-2);
}
.flow-box.is-current {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}
.flow-n {
  font-size: 11px;
  color: var(--vp-c-text-3);
}
.flow-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--vp-c-text-1);
}
.flow-sub {
  font-size: 11.5px;
  line-height: 1.3;
  color: var(--vp-c-text-2);
}
.flow-arrow {
  color: var(--vp-c-text-3);
}
</style>
