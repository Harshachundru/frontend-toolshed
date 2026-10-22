<script setup lang="ts">
// Geometry: three steps in one row, the two queues that feed them below.
const W = 200, H = 56, rowA = 130, rowC = 250
const c1 = 130, c2 = 380, c3 = 630

const steps = [
  { x: c1, y: rowA, name: '1. Run one task', line: 'script or one callback', main: false },
  { x: c2, y: rowA, name: '2. Drain microtasks', line: 'every one, until empty', main: true },
  { x: c3, y: rowA, name: '3. Render if due', line: 'style, layout, paint', main: false },
  { x: c1, y: rowC, name: 'Macrotask queue', line: 'setTimeout, I/O, clicks', main: false },
  { x: c2, y: rowC, name: 'Microtask queue', line: 'promise .then, await', main: false },
]

const arrows = [
  `M${c1 + W / 2} ${rowA}H${c2 - W / 2}`,
  `M${c2 + W / 2} ${rowA}H${c3 - W / 2}`,
  `M${c3} ${rowA - H / 2}V80H${c1}V${rowA - H / 2}`,
  `M${c1} ${rowC - H / 2}V${rowA + H / 2}`,
  `M${c2} ${rowC - H / 2}V${rowA + H / 2}`,
]
</script>

<template>
  <figure class="event-loop">
    <svg viewBox="0 0 760 310" role="img" aria-label="All microtasks run before the next macrotask" font-size="13">
      <defs>
        <marker id="loop-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" class="edge-fill" />
        </marker>
      </defs>
      <text x="24" y="30" font-size="15" font-weight="600" class="ink">All microtasks run before the next macrotask</text>

      <g fill="none" class="edge" stroke-width="1.25">
        <path v-for="d in arrows" :key="d" :d="d" marker-end="url(#loop-arrow)" />
      </g>
      <text :x="c2" y="72" text-anchor="middle" font-size="11.5" class="quiet">repeat for ever</text>

      <g v-for="s in steps" :key="s.name">
        <rect :x="s.x - W / 2" :y="s.y - H / 2" :width="W" :height="H" rx="8"
          :class="s.main ? 'main' : 'plain'" :stroke-width="s.main ? 2 : 1.25" />
        <text :x="s.x" :y="s.y - 4" text-anchor="middle" font-weight="600" class="ink">{{ s.name }}</text>
        <text :x="s.x" :y="s.y + 14" text-anchor="middle" font-size="11.5" class="quiet">{{ s.line }}</text>
      </g>

      <text :x="c1 + 10" y="196" font-size="11.5" class="quiet">takes the oldest one</text>
      <text :x="c2 + 10" y="196" font-size="11.5" class="quiet">takes them all</text>
      <text :x="c3 - W / 2" :y="rowC - 6" font-size="11.5" class="quiet">Browser Web APIs (timers,</text>
      <text :x="c3 - W / 2" :y="rowC + 10" font-size="11.5" class="quiet">fetch, events) add callbacks</text>
      <text :x="c3 - W / 2" :y="rowC + 26" font-size="11.5" class="quiet">to these queues when done.</text>
    </svg>
  </figure>
</template>

<style scoped>
.event-loop {
  margin: 24px 0;
}
svg {
  width: 100%;
  height: auto;
  font-family: var(--vp-font-family-base);
}
.ink {
  fill: var(--vp-c-text-1);
}
.quiet {
  fill: var(--vp-c-text-2);
}
.edge {
  stroke: var(--vp-c-text-3);
}
.edge-fill {
  fill: var(--vp-c-text-3);
}
.plain {
  fill: none;
  stroke: var(--vp-c-text-3);
}
.main {
  fill: var(--vp-c-brand-soft);
  stroke: var(--vp-c-brand-1);
}
</style>
