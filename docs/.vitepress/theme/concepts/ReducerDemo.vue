<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

type State = Readonly<{ privacy: boolean; currency: 'EUR' | 'USD'; theme: 'light' | 'dark'; amounts: readonly number[] }>
type Action =
  | { type: 'privacy/toggled' }
  | { type: 'currency/set'; currency: State['currency'] }
  | { type: 'theme/toggled' }
  | { type: 'transaction/added'; amount: number }

// The same pure function you would pass to useReducer.
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'privacy/toggled': return { ...state, privacy: !state.privacy }
    case 'currency/set': return { ...state, currency: action.currency }
    case 'theme/toggled': return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' }
    case 'transaction/added': return { ...state, amounts: [...state.amounts, action.amount] }
  }
}

// Each component reads only the slice it needs, like a selector.
const components: { name: string; select: (s: State) => unknown }[] = [
  { name: 'Header', select: (s) => s.theme },
  { name: 'Balance card', select: (s) => [s.privacy, s.currency, s.amounts] },
  { name: 'Transactions table', select: (s) => [s.privacy, s.currency, s.amounts] },
  { name: 'Spending chart', select: (s) => [s.theme, s.amounts] },
  { name: 'Settings panel', select: (s) => [s.privacy, s.currency, s.theme] },
]

const state = ref<State>({ privacy: false, currency: 'EUR', theme: 'light', amounts: [120, -40] })
const queue = ref<Action[]>([])
const active = ref<Action | null>(null)
const flashing = ref(new Set<string>())
const log = ref<string[]>([])
let timer: ReturnType<typeof setTimeout> | undefined

function dispatch(a: Action) {
  queue.value.push(a)
  if (!active.value) next()
}

function next() {
  const a = queue.value.shift()
  active.value = a ?? null
  if (!a) return
  timer = setTimeout(() => {
    const prev = state.value
    const updated = reducer(prev, a)
    flashing.value = new Set(
      components.filter((c) => JSON.stringify(c.select(prev)) !== JSON.stringify(c.select(updated))).map((c) => c.name),
    )
    state.value = updated
    log.value.unshift(`${a.type}${'currency' in a ? ` (${a.currency})` : ''}${'amount' in a ? ` (${a.amount})` : ''} → re-rendered ${flashing.value.size} of ${components.length}`)
    timer = setTimeout(() => {
      flashing.value = new Set()
      next()
    }, 700)
  }, 700)
}

onBeforeUnmount(() => clearTimeout(timer))

const balance = computed(() => {
  const s = state.value
  if (s.privacy) return '•••••'
  const sum = s.amounts.reduce((a, b) => a + b, 0)
  return (s.currency === 'EUR' ? '€' : '$') + sum
})
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">Dispatch actions into the store</div>
    <div class="cc-demo-hint">Click several buttons quickly. Actions queue up and the reducer handles them one at a time. Only components whose slice changed re-render.</div>

    <div class="cc-controls">
      <button class="cc-btn" @click="dispatch({ type: 'privacy/toggled' })">Toggle privacy</button>
      <button class="cc-btn" @click="dispatch({ type: 'currency/set', currency: state.currency === 'EUR' ? 'USD' : 'EUR' })">Switch currency</button>
      <button class="cc-btn" @click="dispatch({ type: 'theme/toggled' })">Toggle theme</button>
      <button class="cc-btn" @click="dispatch({ type: 'transaction/added', amount: Math.round(Math.random() * 200 - 80) })">Add transaction</button>
    </div>

    <div class="rd-flow">
      <div class="rd-stage">
        <div class="rd-label">Action queue</div>
        <div class="rd-queue">
          <span v-for="(a, i) in queue" :key="i" class="rd-chip">{{ a.type }}</span>
          <span v-if="!queue.length" class="rd-empty">empty</span>
        </div>
      </div>
      <span class="rd-arrow" aria-hidden="true">→</span>
      <div class="rd-stage" :class="{ busy: active }">
        <div class="rd-label">reducer(state, action)</div>
        <div class="rd-mono">{{ active ? active.type : 'waiting' }}</div>
        <div class="rd-small">pure: no fetch, no mutation, same input → same output</div>
      </div>
      <span class="rd-arrow" aria-hidden="true">→</span>
      <div class="rd-stage">
        <div class="rd-label">New state</div>
        <pre class="rd-state">{{ JSON.stringify(state, null, 1) }}</pre>
      </div>
    </div>

    <div class="rd-subs">
      <div v-for="c in components" :key="c.name" class="rd-sub" :class="{ flash: flashing.has(c.name) }">
        {{ c.name }}
        <small v-if="c.name === 'Balance card'">{{ balance }}</small>
      </div>
    </div>

    <div class="rd-log">
      <div v-for="(l, i) in log.slice(0, 5)" :key="log.length - i">{{ l }}</div>
    </div>
  </div>
</template>

<style scoped>
.rd-flow {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: stretch;
  gap: 8px;
}
.rd-stage {
  padding: 8px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 12.5px;
  transition: border-color 0.2s, background 0.2s;
}
.rd-stage.busy {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.rd-label {
  margin-bottom: 4px;
  font-weight: 600;
}
.rd-arrow {
  align-self: center;
  color: var(--vp-c-text-3);
}
.rd-queue {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rd-chip {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--vp-c-warning-soft);
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  animation: drop-in 0.25s ease-out;
}
@keyframes drop-in {
  from { opacity: 0; transform: translateY(-6px); }
}
.rd-empty,
.rd-small {
  color: var(--vp-c-text-3);
  font-size: 11.5px;
}
.rd-mono {
  font-family: var(--vp-font-family-mono);
}
.rd-state {
  margin: 0 !important;
  padding: 0 !important;
  background: none !important;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre-wrap;
}
.rd-subs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.rd-sub {
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 12.5px;
  text-align: center;
  transition: background 0.2s, border-color 0.2s;
}
.rd-sub small {
  display: block;
  font-weight: 600;
}
.rd-sub.flash {
  border-color: var(--vp-c-success-1);
  background: var(--vp-c-success-soft);
}
.rd-log {
  margin-top: 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--vp-c-text-2);
}
@media (max-width: 640px) {
  .rd-flow {
    grid-template-columns: 1fr;
  }
  .rd-arrow {
    transform: rotate(90deg);
    justify-self: center;
  }
}
</style>
