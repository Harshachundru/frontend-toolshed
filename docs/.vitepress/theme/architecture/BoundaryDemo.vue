<script setup lang="ts">
import { ref, computed } from 'vue'

// Three layers: the app wires routes, domains hold features, the platform holds shared code.
const W = 140, H = 40
const nodes = {
  app: { x: 390, y: 40, name: 'app (routes)', layer: 'app' },
  user: { x: 156, y: 150, name: 'domains/user', layer: 'domain' },
  catalogue: { x: 312, y: 150, name: 'domains/catalogue', layer: 'domain' },
  checkout: { x: 468, y: 150, name: 'domains/checkout', layer: 'domain' },
  payments: { x: 624, y: 150, name: 'domains/payments', layer: 'domain' },
  ds: { x: 156, y: 262, name: 'platform/design-system', layer: 'platform' },
  auth: { x: 312, y: 262, name: 'platform/auth', layer: 'platform' },
  data: { x: 468, y: 262, name: 'platform/data-client', layer: 'platform' },
  analytics: { x: 624, y: 262, name: 'platform/analytics', layer: 'platform' },
} as const
type Id = keyof typeof nodes

const base: [Id, Id][] = [
  ['app', 'user'], ['app', 'catalogue'], ['app', 'checkout'],
  ['user', 'auth'], ['catalogue', 'data'], ['checkout', 'data'], ['payments', 'data'], ['catalogue', 'ds'], ['checkout', 'ds'],
]

interface Candidate { from: Id; to: Id; code: string; ok: boolean; message: string }
const candidates: Candidate[] = [
  { from: 'checkout', to: 'payments', code: "import { startPayment } from '@domains/payments'", ok: true, message: 'Allowed: a domain may use another domain through its public index.ts.' },
  { from: 'checkout', to: 'payments', code: "import { stripe } from '@domains/payments/internal/stripe'", ok: false, message: "boundaries/no-private: '@domains/payments/internal/stripe' is private to domains/payments. Import from its public API instead." },
  { from: 'ds', to: 'user', code: "import { useCurrentUser } from '@domains/user'  // in design-system", ok: false, message: 'boundaries/element-types: platform must not import domains. The design system would then depend on one product feature.' },
  { from: 'user', to: 'analytics', code: "import { track } from '@platform/analytics'", ok: true, message: 'Allowed: domains depend on the platform, never the other way round.' },
  { from: 'catalogue', to: 'checkout', code: "import { cartStore } from '@domains/checkout/store'", ok: false, message: "boundaries/no-private: catalogue reaches into checkout's store. Expose addToCart() from checkout's public API, or publish an event." },
]

const on = ref(new Set<number>([0]))
function toggle(i: number) {
  const s = new Set(on.value)
  s.has(i) ? s.delete(i) : s.add(i)
  on.value = s
}
const active = computed(() => [...on.value].map((i) => candidates[i]))
const errors = computed(() => active.value.filter((c) => !c.ok))

// Same-row imports arc above the boxes; `lift` separates two arcs between the same pair.
function path(a: Id, b: Id, lift = 0) {
  const p = nodes[a], q = nodes[b]
  if (p.y === q.y) {
    const dir = q.x > p.x ? 1 : -1
    const x1 = p.x + dir * 30, x2 = q.x - dir * 30
    const top = p.y - H / 2, peak = top - 34 - lift
    return `M${x1} ${top}C${x1} ${peak} ${x2} ${peak} ${x2} ${top - 3}`
  }
  const down = q.y > p.y
  const y1 = p.y + (down ? H / 2 : -H / 2), y2 = q.y + (down ? -H / 2 - 3 : H / 2 + 3)
  return `M${p.x} ${y1}C${p.x} ${(y1 + y2) / 2} ${q.x} ${(y1 + y2) / 2} ${q.x} ${y2}`
}
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">Module boundaries in a modular monolith</div>
    <div class="cc-demo-hint">Add imports to the codebase. A lint rule in CI checks each one against the boundaries.</div>

    <svg class="cc-svg" viewBox="0 0 720 300" role="img" aria-label="Module dependency graph" font-size="11.5">
      <defs>
        <marker id="bd-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" class="cc-fill-edge" />
        </marker>
        <marker id="bd-new" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" class="bd-fill-new" />
        </marker>
        <marker id="bd-bad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" class="bd-fill-bad" />
        </marker>
      </defs>

      <text x="8" y="44" class="cc-quiet">App</text>
      <text x="8" y="154" class="cc-quiet">Domains</text>
      <text x="8" y="266" class="cc-quiet">Platform</text>

      <path v-for="[a, b] in base" :key="a + b" :d="path(a, b)" fill="none" stroke-width="1.1" class="cc-stroke-edge" marker-end="url(#bd-ok)" />
      <path
        v-for="c in active"
        :key="c.code"
        :d="path(c.from, c.to, c.ok ? 0 : 22)"
        fill="none"
        stroke-width="2.2"
        :stroke-dasharray="c.ok ? undefined : '6 4'"
        :class="c.ok ? 'bd-new' : 'bd-bad'"
        :marker-end="`url(#bd-${c.ok ? 'new' : 'bad'})`"
      />

      <g v-for="(n, id) in nodes" :key="id">
        <rect :x="n.x - W / 2" :y="n.y - H / 2" :width="W" :height="H" rx="8" :class="['bd-node', n.layer]" />
        <text :x="n.x" :y="n.y + 4" text-anchor="middle" class="cc-ink">{{ n.name }}</text>
      </g>
    </svg>

    <div class="bd-list">
      <label v-for="(c, i) in candidates" :key="c.code" class="bd-item" :class="{ checked: on.has(i) }">
        <input type="checkbox" :checked="on.has(i)" @change="toggle(i)" />
        <code>{{ c.code }}</code>
        <span class="bd-from">in {{ nodes[c.from].name }}</span>
      </label>
    </div>

    <div class="bd-lint" :class="{ fail: errors.length }">
      <div class="bd-lint-head">$ eslint src/ {{ errors.length ? `✖ ${errors.length} problem${errors.length > 1 ? 's' : ''}` : '✔ no boundary violations' }}</div>
      <div v-for="c in active" :key="c.code" :class="c.ok ? 'ok' : 'err'">{{ c.ok ? '✔' : '✖' }} {{ c.message }}</div>
    </div>
  </div>
</template>

<style scoped>
.bd-node {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-text-3);
  stroke-width: 1.2;
}
.bd-node.app {
  fill: var(--vp-c-default-soft);
}
.bd-node.domain {
  fill: var(--vp-c-brand-soft);
  stroke: var(--vp-c-brand-1);
}
.bd-new {
  stroke: var(--vp-c-success-1);
}
.bd-bad {
  stroke: var(--vp-c-danger-1);
}
.bd-fill-new {
  fill: var(--vp-c-success-1);
}
.bd-fill-bad {
  fill: var(--vp-c-danger-1);
}
.bd-list {
  display: grid;
  gap: 4px;
  margin: 10px 0;
}
.bd-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  padding: 4px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  cursor: pointer;
}
.bd-item.checked {
  border-color: var(--vp-c-brand-1);
}
.bd-item code {
  font-size: 11.5px;
  word-break: break-all;
}
.bd-from {
  color: var(--vp-c-text-3);
}
.bd-lint {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--vp-code-block-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.6;
}
.bd-lint-head {
  font-weight: 600;
  color: var(--vp-c-success-1);
}
.bd-lint.fail .bd-lint-head,
.err {
  color: var(--vp-c-danger-1);
}
.ok {
  color: var(--vp-c-text-2);
}
</style>
