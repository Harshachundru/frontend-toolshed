<script setup lang="ts">
import { computed, ref } from 'vue'

type LayerId = 'e2e' | 'integration' | 'unit' | 'static'
type Shape = 'pyramid' | 'trophy'

interface Layer {
  id: LayerId
  name: string
  what: string
  example: string
  tools: string
  runtime: string
  speed: number
  confidence: number
  // Width of the bar as a % of the diagram, and how many tests it gets, per shape.
  width: Record<Shape, number>
  share: Record<Shape, string>
}

// Top to bottom, as drawn.
const layers: Layer[] = [
  {
    id: 'e2e',
    name: 'End-to-end',
    what: 'A real browser drives the real app, with a real backend behind it.',
    example: 'Sign in, send a transfer, see "Transfer sent".',
    tools: 'Playwright, Cypress',
    runtime: 'Seconds to minutes per test',
    speed: 1,
    confidence: 5,
    width: { pyramid: 40, trophy: 30 },
    share: { pyramid: 'Few', trophy: 'Few' },
  },
  {
    id: 'integration',
    name: 'Integration',
    what: 'A real screen with its real children and state. Only the network is fake.',
    example: 'Type 5000, click Send, the API returns 422, the form shows "Insufficient funds".',
    tools: 'React Testing Library, MSW, Vitest',
    runtime: 'Tens to hundreds of milliseconds',
    speed: 3,
    confidence: 4,
    width: { pyramid: 60, trophy: 92 },
    share: { pyramid: 'Some', trophy: 'Most' },
  },
  {
    id: 'unit',
    name: 'Unit',
    what: 'One function on its own. No page, no network, no timers.',
    example: 'formatMoney(-500, "EUR") returns "-€5.00".',
    tools: 'Vitest, Jest',
    runtime: 'A few milliseconds',
    speed: 4,
    confidence: 2,
    width: { pyramid: 90, trophy: 52 },
    share: { pyramid: 'Many', trophy: 'Some' },
  },
  {
    id: 'static',
    name: 'Static analysis',
    what: 'Checks the code without running it, every time you save.',
    example: 'TypeScript flags a misspelt prop. ESLint flags an image with no alt text.',
    tools: 'TypeScript, ESLint',
    runtime: 'Instant, in the editor',
    speed: 5,
    confidence: 1,
    width: { pyramid: 0, trophy: 72 },
    share: { pyramid: 'Not in the pyramid', trophy: 'The base' },
  },
]

interface Bug {
  label: string
  layer: LayerId
  why: string
}

const bugs: Bug[] = [
  { label: 'A misspelt prop name', layer: 'static', why: 'TypeScript reports it before anything runs.' },
  { label: 'formatMoney rounds €0.005 the wrong way', layer: 'unit', why: 'It is one pure function with a rule. A unit test pins every case in milliseconds.' },
  { label: 'The form shows nothing when the API returns 422', layer: 'integration', why: 'The bug is in how the form, its state and the API call fit together. Render the screen and fake a 422 with MSW.' },
  { label: 'The production build calls the staging API', layer: 'e2e', why: 'Only a real build against a real environment can see a wrong environment variable.' },
]

const shape = ref<Shape>('trophy')
const selected = ref<LayerId>('integration')
const bug = ref<Bug | null>(null)

const visible = computed(() => layers.filter((l) => l.width[shape.value] > 0))
const current = computed(() => layers.find((l) => l.id === selected.value)!)

function setShape(s: Shape) {
  shape.value = s
  if (s === 'pyramid' && selected.value === 'static') selected.value = 'unit'
}

function pickBug(b: Bug) {
  bug.value = b
  if (shape.value === 'trophy' || b.layer !== 'static') selected.value = b.layer
}

const bugNote = computed(() => {
  const b = bug.value
  if (!b) return ''
  if (shape.value === 'pyramid' && b.layer === 'static') {
    return 'The pyramid has no layer for this. A unit test could catch it, but the trophy catches it free with static analysis. Switch to the trophy to see it.'
  }
  const name = layers.find((l) => l.id === b.layer)!.name
  return `Cheapest layer: ${name}. ${b.why}`
})
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">Testing pyramid vs testing trophy</div>
    <div class="cc-demo-hint">Switch shape and watch the layers resize. Click a layer for details, or pick a bug to see which layer should catch it.</div>

    <div class="cc-controls" role="group" aria-label="Shape">
      <button class="cc-btn" :aria-pressed="shape === 'pyramid'" @click="setShape('pyramid')">Pyramid (Mike Cohn)</button>
      <button class="cc-btn" :aria-pressed="shape === 'trophy'" @click="setShape('trophy')">Trophy (Kent C. Dodds)</button>
    </div>

    <div class="ts-grid">
      <div class="ts-shape" :class="shape">
        <div class="ts-axis" aria-hidden="true">
          <span>Slower, more confidence</span>
          <span class="ts-arrow" />
          <span>Faster, cheaper</span>
        </div>
        <div class="ts-stack">
          <button
            v-for="l in layers"
            :key="l.id"
            class="ts-layer"
            :class="[
              `ts-${l.id}`,
              {
                'is-on': selected === l.id,
                'is-hidden': l.width[shape] === 0,
                'is-hit': bug && bug.layer === l.id && l.width[shape] > 0,
              },
            ]"
            :style="{ width: `${l.width[shape]}%` }"
            :tabindex="l.width[shape] === 0 ? -1 : 0"
            :aria-hidden="l.width[shape] === 0"
            :aria-pressed="selected === l.id"
            @click="selected = l.id"
          >
            <span class="ts-name">{{ l.name }}</span>
            <span class="ts-share">{{ l.share[shape] }}</span>
          </button>
        </div>
      </div>

      <div class="ts-panel" aria-live="polite">
        <div class="ts-panel-head">
          <strong>{{ current.name }}</strong>
          <span class="ts-badge">{{ current.share[shape] }}</span>
        </div>
        <p>{{ current.what }}</p>
        <dl>
          <dt>Example</dt><dd>{{ current.example }}</dd>
          <dt>Tools</dt><dd>{{ current.tools }}</dd>
          <dt>Runs in</dt><dd>{{ current.runtime }}</dd>
        </dl>
        <div class="ts-meter">
          <span>Speed</span>
          <span class="ts-dots" :aria-label="`${current.speed} of 5`">
            <i v-for="n in 5" :key="n" :class="{ on: n <= current.speed }" />
          </span>
        </div>
        <div class="ts-meter">
          <span>Confidence</span>
          <span class="ts-dots" :aria-label="`${current.confidence} of 5`">
            <i v-for="n in 5" :key="n" :class="{ on: n <= current.confidence }" />
          </span>
        </div>
      </div>
    </div>

    <div class="cc-demo-title" style="margin-top: 16px">Where would you catch this bug?</div>
    <div class="cc-controls" role="group" aria-label="Bugs">
      <button
        v-for="b in bugs"
        :key="b.label"
        class="cc-btn"
        :aria-pressed="bug === b"
        @click="pickBug(b)"
      >{{ b.label }}</button>
    </div>
    <div class="cc-note">
      {{ bugNote || 'Pick a bug. The rule: catch each bug at the cheapest layer that can catch it.' }}
    </div>
    <div v-if="visible.length" class="ts-sr" aria-live="polite">{{ shape }} shown with {{ visible.length }} layers</div>
  </div>
</template>

<style scoped>
.ts-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  align-items: start;
}
.ts-shape {
  display: flex;
  gap: 8px;
}
.ts-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 64px;
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  color: var(--vp-c-text-3);
}
.ts-arrow {
  flex: 1;
  width: 2px;
  margin: 6px 0;
  background: linear-gradient(var(--vp-c-text-3), var(--vp-c-divider));
}
.ts-stack {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.ts-layer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 58px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
  transition: width 0.6s cubic-bezier(0.3, 0.7, 0.2, 1), height 0.6s, opacity 0.4s,
    border-radius 0.6s, background 0.2s, border-color 0.2s, clip-path 0.6s;
}
.ts-layer:hover {
  border-color: var(--vp-c-brand-1);
}
.ts-layer:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
.ts-layer.is-on {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.ts-layer.is-hit {
  animation: ts-pulse 1s ease-out 2;
}
.ts-layer.is-hidden {
  height: 0;
  border-width: 0;
  opacity: 0;
  pointer-events: none;
}
/* The pyramid slants its sides; the trophy uses rounded bars, with a bowl for integration. */
.pyramid .ts-layer {
  border-radius: 0;
  clip-path: polygon(7% 0, 93% 0, 100% 100%, 0 100%);
}
.trophy .ts-layer {
  border-radius: 8px;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
}
.trophy .ts-integration {
  height: 86px;
  border-radius: 8px 8px 48px 48px;
}
.trophy .ts-static {
  border-radius: 4px;
}
.ts-name {
  font-size: 13px;
  font-weight: 600;
}
.ts-share {
  font-size: 11px;
  color: var(--vp-c-text-2);
}
.ts-panel {
  padding: 12px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 13px;
}
.ts-panel p {
  margin: 6px 0 8px;
}
.ts-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ts-badge {
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--vp-c-default-soft);
  font-size: 11px;
  color: var(--vp-c-text-2);
}
.ts-panel dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  margin: 0 0 10px;
}
.ts-panel dt {
  color: var(--vp-c-text-2);
}
.ts-panel dd {
  margin: 0;
}
.ts-meter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  color: var(--vp-c-text-2);
}
.ts-dots {
  display: flex;
  gap: 4px;
}
.ts-dots i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-default-soft);
  transition: background 0.3s;
}
.ts-dots i.on {
  background: var(--vp-c-brand-1);
}
.ts-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
@keyframes ts-pulse {
  0% { box-shadow: 0 0 0 0 var(--vp-c-brand-1); }
  100% { box-shadow: 0 0 0 10px transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .ts-layer { transition: none; }
  .ts-layer.is-hit { animation: none; }
}
@media (max-width: 640px) {
  .ts-grid {
    grid-template-columns: 1fr;
  }
  .ts-axis {
    display: none;
  }
}
</style>
