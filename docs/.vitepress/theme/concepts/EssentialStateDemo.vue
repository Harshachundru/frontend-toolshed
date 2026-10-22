<script setup lang="ts">
import { reactive, ref, computed } from 'vue'

// Essential state: four inputs. Everything else on the receipt is derived from them.
const s = reactive({ price: 80, qty: 1, discount: 25, shipping: 5, tax: 23 })

const derived = computed(() => {
  const discounted = s.price * (1 - s.discount / 100)
  const subtotal = discounted * s.qty
  const taxes = subtotal * (s.tax / 100)
  return { discounted, label: `${s.discount}% off`, subtotal, taxes, total: subtotal + taxes + s.shipping }
})

// The naive version keeps every number in its own piece of state and must update them by hand.
const naiveMode = ref(false)
const naive = reactive({ ...snapshot() })
function snapshot() {
  const d = derived.value
  return { discounted: d.discounted, subtotal: d.subtotal, taxes: d.taxes, total: d.total }
}
function naiveQty(delta: number) {
  s.qty = Math.max(1, s.qty + delta)
  // A typical bug: the handler updates subtotal and total but forgets taxes.
  naive.subtotal = naive.discounted * s.qty
  naive.total = naive.subtotal + naive.taxes + s.shipping
}
function syncNaive() {
  Object.assign(naive, snapshot())
}
function setMode(n: boolean) {
  naiveMode.value = n
  syncNaive()
}

const rows = computed(() => {
  const d = derived.value
  return [
    { key: 'discounted', label: 'Discounted price', formula: 'price × (1 − discount)', value: d.discounted },
    { key: 'subtotal', label: 'Subtotal', formula: 'discounted × quantity', value: d.subtotal },
    { key: 'taxes', label: 'Tax', formula: 'subtotal × tax rate', value: d.taxes },
    { key: 'total', label: 'Total', formula: 'subtotal + tax + shipping', value: d.total },
  ] as const
})
const money = (n: number) => '€' + n.toFixed(2)
const shown = (key: 'discounted' | 'subtotal' | 'taxes' | 'total', v: number) => (naiveMode.value ? naive[key] : v)
const wrong = (key: 'discounted' | 'subtotal' | 'taxes' | 'total', v: number) => naiveMode.value && Math.abs(naive[key] - v) > 0.005
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">A checkout receipt</div>
    <div class="cc-demo-hint">Change the quantity in both modes. Derived values cannot drift; duplicated state can.</div>

    <div class="cc-controls" role="group" aria-label="State model">
      <button class="cc-btn" :aria-pressed="!naiveMode" @click="setMode(false)">Essential state + derived values</button>
      <button class="cc-btn" :aria-pressed="naiveMode" @click="setMode(true)">Naive: store everything</button>
    </div>

    <div class="es">
      <div class="es-state">
        <div class="es-head">State ({{ naiveMode ? 10 : 5 }} values)</div>
        <label>Price <input v-model.number="s.price" type="number" min="0" @input="syncNaive" /></label>
        <div class="es-field">Quantity
          <span class="qty">
            <button class="cc-btn" aria-label="Decrease quantity" @click="naiveMode ? naiveQty(-1) : (s.qty = Math.max(1, s.qty - 1))">−</button>
            {{ s.qty }}
            <button class="cc-btn" aria-label="Increase quantity" @click="naiveMode ? naiveQty(1) : s.qty++">+</button>
          </span>
        </div>
        <label>Discount % <input v-model.number="s.discount" type="number" min="0" max="100" @input="syncNaive" /></label>
        <label>Shipping <input v-model.number="s.shipping" type="number" min="0" @input="syncNaive" /></label>
        <label>Tax rate % <input v-model.number="s.tax" type="number" min="0" @input="syncNaive" /></label>
        <div v-if="naiveMode" class="es-naive">+ discounted price, discount label, subtotal, tax and total, all kept in state too</div>
      </div>

      <div class="es-receipt">
        <div class="es-head">Receipt</div>
        <div class="es-row"><span>{{ derived.label }}</span><span class="tag">derived</span></div>
        <div v-for="r in rows" :key="r.key" class="es-row" :class="{ bad: wrong(r.key, r.value) }">
          <span>{{ r.label }} <small>{{ naiveMode ? 'stored' : r.formula }}</small></span>
          <strong>{{ money(shown(r.key, r.value)) }}</strong>
        </div>
        <div v-if="naiveMode && rows.some((r) => wrong(r.key, r.value))" class="es-warn">
          Out of sync: tax was not updated, so the total is wrong. Correct total is {{ money(derived.total) }}.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.es {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.es-state,
.es-receipt {
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 13px;
}
.es-head {
  margin-bottom: 6px;
  font-weight: 600;
}
.es-state label,
.es-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
}
.es-state input {
  width: 72px;
  padding: 2px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  text-align: right;
}
.qty {
  display: flex;
  align-items: center;
  gap: 8px;
}
.qty .cc-btn {
  padding: 0 8px;
}
.es-naive {
  margin-top: 6px;
  color: var(--vp-c-warning-1);
  font-size: 12px;
}
.es-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 4px 6px;
  border-radius: 6px;
}
.es-row small {
  display: block;
  color: var(--vp-c-text-3);
}
.es-row.bad {
  background: var(--vp-c-danger-soft);
}
.tag {
  font-size: 11px;
  color: var(--vp-c-text-3);
}
.es-warn {
  margin-top: 8px;
  color: var(--vp-c-danger-1);
  font-size: 12.5px;
}
@media (max-width: 560px) {
  .es {
    grid-template-columns: 1fr;
  }
}
</style>
