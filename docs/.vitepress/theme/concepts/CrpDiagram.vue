<script setup lang="ts">
import { ref, computed } from 'vue'

// Geometry: inputs on the left, trees in the middle, the rendering pipeline on the right.
const W = 136, H = 44
const nodes = {
  html: { x: 90, y: 60, name: 'HTML', line: 'bytes from the server' },
  css: { x: 90, y: 150, name: 'CSS', line: 'render-blocking' },
  js: { x: 90, y: 240, name: 'JavaScript', line: 'parser-blocking' },
  dom: { x: 270, y: 60, name: 'DOM', line: 'tree of elements' },
  cssom: { x: 270, y: 150, name: 'CSSOM', line: 'tree of styles' },
  render: { x: 450, y: 105, name: 'Render tree', line: 'style: visible nodes' },
  layout: { x: 650, y: 50, name: 'Layout', line: 'sizes and positions' },
  paint: { x: 650, y: 125, name: 'Paint', line: 'pixels into layers' },
  composite: { x: 650, y: 200, name: 'Composite', line: 'layers on the GPU' },
  pixels: { x: 650, y: 275, name: 'First paint', line: 'FCP milestone' },
} as const
type Id = keyof typeof nodes

const edges: [Id, Id, boolean?][] = [
  ['html', 'dom'], ['css', 'cssom'], ['js', 'dom', true],
  ['dom', 'render'], ['cssom', 'render'],
  ['render', 'layout'], ['layout', 'paint'], ['paint', 'composite'], ['composite', 'pixels'],
]

const steps: { on: Id[]; text: string }[] = [
  { on: ['html'], text: 'The browser receives HTML and reads it top to bottom, one token at a time.' },
  { on: ['html', 'dom'], text: 'Each tag becomes a node in the DOM. Content near the top of <body> can paint sooner.' },
  { on: ['css', 'cssom'], text: 'A <link rel="stylesheet"> is downloaded and parsed into the CSSOM. Rendering waits for all of it, because any rule could change the first element.' },
  { on: ['js', 'dom'], text: 'A plain <script> stops the HTML parser until it has downloaded and run, because it might change the DOM. Use defer or type="module" to avoid this.' },
  { on: ['dom', 'cssom', 'render'], text: 'DOM and CSSOM combine into the render tree: only visible nodes, each with its computed style (display: none is left out).' },
  { on: ['layout'], text: 'Layout (reflow) works out the exact size and position of every box for this viewport.' },
  { on: ['paint'], text: 'Paint fills in pixels for text, colours, borders and images, often on several layers.' },
  { on: ['composite'], text: 'The compositor stacks the layers on the GPU. Animating transform or opacity only redoes this step, which is why it is cheap.' },
  { on: ['pixels'], text: 'Pixels reach the screen. The first time content appears is First Contentful Paint, the first milestone users notice.' },
]

const step = ref(0)
const lit = computed(() => new Set(steps[step.value].on))

function edgePath(a: Id, b: Id) {
  const p = nodes[a], q = nodes[b]
  if (p.x === q.x) return `M${p.x} ${p.y + H / 2}V${q.y - H / 2 - 3}`
  const x1 = p.x + W / 2, x2 = q.x - W / 2 - 3
  const mid = (x1 + x2) / 2
  return `M${x1} ${p.y}C${mid} ${p.y} ${mid} ${q.y} ${x2} ${q.y}`
}

// The second half: what each script mode does to the parser. Numbers are percentages of a timeline.
type Mode = 'blocking' | 'defer' | 'async'
const mode = ref<Mode>('blocking')
const modes: Record<Mode, { label: string; parse: [number, number][]; download: [number, number]; run: [number, number]; fcp: number; text: string }> = {
  blocking: {
    label: '<script src>',
    parse: [[0, 20], [62, 84]], download: [20, 52], run: [52, 62], fcp: 88,
    text: 'The parser stops at the script, waits for the download and the run, then carries on. Nothing below the script can render in the meantime.',
  },
  defer: {
    label: '<script defer>',
    parse: [[0, 46]], download: [12, 40], run: [46, 56], fcp: 50,
    text: 'Downloads in parallel and runs after parsing finishes, in document order, before DOMContentLoaded. The default choice for app code (type="module" behaves like this).',
  },
  async: {
    label: '<script async>',
    parse: [[0, 34], [44, 64]], download: [12, 34], run: [34, 44], fcp: 68,
    text: 'Downloads in parallel but runs as soon as it arrives, pausing the parser. Order is not guaranteed. Good for independent scripts such as analytics.',
  },
}
const m = computed(() => modes[mode.value])
const bar = (r: [number, number]) => ({ left: r[0] + '%', width: r[1] - r[0] + '%' })
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">From bytes to pixels</div>
    <div class="cc-demo-hint">Step through the pipeline, or click any box.</div>

    <svg class="cc-svg" viewBox="0 0 760 310" role="img" aria-label="Critical rendering path" font-size="12.5">
      <defs>
        <marker id="crp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" class="cc-fill-edge" />
        </marker>
      </defs>
      <path
        v-for="[a, b, dashed] in edges"
        :key="a + b"
        :d="edgePath(a, b)"
        fill="none"
        stroke-width="1.25"
        :stroke-dasharray="dashed ? '5 4' : undefined"
        class="cc-stroke-edge"
        marker-end="url(#crp-arrow)"
      />
      <text x="164" y="264" font-size="11" class="cc-quiet">can pause the parser</text>

      <g
        v-for="(n, id) in nodes"
        :key="id"
        class="crp-node"
        role="button"
        tabindex="0"
        @click="step = Math.max(0, steps.findIndex((s) => s.on.includes(id)))"
        @keydown.enter="step = Math.max(0, steps.findIndex((s) => s.on.includes(id)))"
      >
        <rect
          :x="n.x - W / 2" :y="n.y - H / 2" :width="W" :height="H" rx="8"
          :class="lit.has(id) ? 'cc-box-on' : 'cc-box'"
          :stroke-width="lit.has(id) ? 2 : 1.25"
        />
        <text :x="n.x" :y="n.y - 3" text-anchor="middle" font-weight="600" class="cc-ink">{{ n.name }}</text>
        <text :x="n.x" :y="n.y + 13" text-anchor="middle" font-size="11" class="cc-quiet">{{ n.line }}</text>
      </g>
    </svg>

    <div class="cc-note" aria-live="polite"><strong>Step {{ step + 1 }} of {{ steps.length }}.</strong> {{ steps[step].text }}</div>
    <div class="cc-controls">
      <button class="cc-btn" :disabled="step === 0" @click="step--">← Back</button>
      <button class="cc-btn" :disabled="step === steps.length - 1" @click="step++">Next →</button>
    </div>

    <div class="cc-demo-title" style="margin-top: 18px">How a script tag changes the timeline</div>
    <div class="cc-controls" role="group" aria-label="Script mode">
      <button v-for="(v, k) in modes" :key="k" class="cc-btn" :aria-pressed="mode === k" @click="mode = k">
        <code>{{ v.label }}</code>
      </button>
    </div>
    <div class="wf">
      <div class="wf-row">
        <span class="wf-label">HTML parser</span>
        <span class="wf-track"><span v-for="r in m.parse" :key="r[0]" class="wf-bar wf-parse" :style="bar(r)" /></span>
      </div>
      <div class="wf-row">
        <span class="wf-label">Script download</span>
        <span class="wf-track"><span class="wf-bar wf-down" :style="bar(m.download)" /></span>
      </div>
      <div class="wf-row">
        <span class="wf-label">Script runs</span>
        <span class="wf-track"><span class="wf-bar wf-run" :style="bar(m.run)" /></span>
      </div>
      <div class="wf-row">
        <span class="wf-label" />
        <span class="wf-track wf-axis"><span class="wf-fcp" :style="{ left: m.fcp + '%' }">FCP</span></span>
      </div>
    </div>
    <div class="cc-note">{{ m.text }}</div>
  </div>
</template>

<style scoped>
.crp-node {
  cursor: pointer;
}
.crp-node rect {
  transition: fill 0.25s, stroke 0.25s;
}
.wf {
  display: grid;
  gap: 6px;
  margin: 8px 0 12px;
}
.wf-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}
.wf-track {
  position: relative;
  height: 16px;
  border-radius: 4px;
  background: var(--vp-c-bg);
}
.wf-axis {
  background: none;
}
.wf-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 4px;
  transition: left 0.4s, width 0.4s;
}
.wf-parse {
  background: var(--vp-c-brand-1);
}
.wf-down {
  background: var(--vp-c-text-3);
}
.wf-run {
  background: var(--vp-c-warning-1);
}
.wf-fcp {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--vp-c-success-1);
  transition: left 0.4s;
}
.wf-fcp::before {
  content: '▲ ';
}
@media (max-width: 520px) {
  .wf-row {
    grid-template-columns: 90px 1fr;
  }
}
</style>
