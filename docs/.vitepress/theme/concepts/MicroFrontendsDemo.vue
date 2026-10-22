<script setup lang="ts">
import { ref, reactive, onBeforeUnmount } from 'vue'

type Topic = 'shell:locale' | 'shell:logout' | 'cart:item-added' | 'search:submitted'
interface Msg { id: number; topic: Topic; from: string; payload: string }

// Each micro frontend is its own app: own team, own release, own subscriptions.
const apps = reactive([
  { id: 'header', name: 'Header + search', team: 'Discovery team', version: 'v3.12.0', subs: ['shell:locale', 'shell:logout', 'cart:item-added'] as Topic[], view: 'Cart (0)' },
  { id: 'deals', name: 'Deals', team: 'Promotions team', version: 'v1.4.2', subs: ['shell:locale', 'search:submitted'] as Topic[], view: 'Deals in EUR' },
  { id: 'product', name: 'Featured products', team: 'Catalogue team', version: 'v7.0.1', subs: ['shell:locale', 'search:submitted'] as Topic[], view: 'Showing: all' },
  { id: 'cart', name: 'Mini cart', team: 'Checkout team', version: 'v2.9.5', subs: ['shell:logout', 'cart:item-added'] as Topic[], view: '0 items' },
])
const shell = reactive({ locale: 'en-IE', user: 'alice@example.com' })

const bus = ref<Msg[]>([])
const delivering = ref<Msg | null>(null)
const hit = ref(new Set<string>())
let seq = 0, cart = 0
let timer: ReturnType<typeof setTimeout> | undefined

function publish(topic: Topic, from: string, payload: string) {
  bus.value.push({ id: ++seq, topic, from, payload })
  if (!delivering.value) deliver()
}

function deliver() {
  const m = bus.value.shift() ?? null
  delivering.value = m
  hit.value = new Set()
  if (!m) return
  timer = setTimeout(() => {
    hit.value = new Set(apps.filter((a) => a.subs.includes(m.topic)).map((a) => a.id))
    apply(m)
    timer = setTimeout(deliver, 900)
  }, 500)
}

// What each subscriber does with the event. Only the event contract is shared, never internals.
function apply(m: Msg) {
  for (const a of apps) {
    if (!a.subs.includes(m.topic)) continue
    if (m.topic === 'cart:item-added') a.view = a.id === 'cart' ? `${cart} items` : `Cart (${cart})`
    if (m.topic === 'shell:logout') a.view = a.id === 'cart' ? '0 items (signed out)' : 'Sign in'
    if (m.topic === 'shell:locale') a.view = a.id === 'deals' ? `Deals in ${shell.locale === 'en-US' ? 'USD' : 'EUR'}` : `Locale: ${shell.locale}`
    if (m.topic === 'search:submitted') a.view = `Showing: ${m.payload}`
  }
}

function addToCart() {
  cart++
  publish('cart:item-added', 'Featured products', '{ sku: "SHOE-42" }')
}
function switchLocale() {
  shell.locale = shell.locale === 'en-IE' ? 'en-US' : 'en-IE'
  publish('shell:locale', 'Shell', `{ locale: "${shell.locale}" }`)
}
function search() {
  publish('search:submitted', 'Header + search', 'trail shoes')
}
function logout() {
  cart = 0
  publish('shell:logout', 'Shell', '{}')
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">A shell, four apps, one event bus</div>
    <div class="cc-demo-hint">Fire events from different apps. Messages wait in the bus and are delivered only to the apps subscribed to that topic.</div>

    <div class="cc-controls">
      <button class="cc-btn" @click="addToCart">Products: add to cart</button>
      <button class="cc-btn" @click="search">Header: search</button>
      <button class="cc-btn" @click="switchLocale">Shell: switch locale</button>
      <button class="cc-btn" @click="logout">Shell: log out</button>
    </div>

    <div class="mf">
      <div class="mf-shell">
        <strong>App shell</strong>
        <span>routing · auth ({{ shell.user }}) · locale {{ shell.locale }} · theme · design tokens</span>
      </div>

      <div class="mf-bus">
        <span class="mf-bus-label">Event bus</span>
        <span v-if="delivering" class="mf-msg active">{{ delivering.topic }} <small>from {{ delivering.from }}</small></span>
        <span v-for="m in bus" :key="m.id" class="mf-msg">{{ m.topic }}</span>
        <span v-if="!delivering && !bus.length" class="mf-idle">idle</span>
      </div>

      <div class="mf-apps">
        <div v-for="a in apps" :key="a.id" class="mf-app" :class="{ hit: hit.has(a.id) }">
          <div class="mf-app-head"><strong>{{ a.name }}</strong><code>{{ a.version }}</code></div>
          <div class="mf-team">{{ a.team }} · deploys on its own</div>
          <div class="mf-view">{{ a.view }}</div>
          <div class="mf-subs">
            <span v-for="t in a.subs" :key="t" :class="{ on: delivering?.topic === t }">{{ t }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mf {
  display: grid;
  gap: 10px;
}
.mf-shell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 10px 12px;
  border: 2px solid var(--vp-c-brand-1);
  border-radius: 8px;
  background: var(--vp-c-brand-soft);
  font-size: 13px;
}
.mf-shell span {
  color: var(--vp-c-text-2);
}
.mf-bus {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 6px 10px;
  border: 1px dashed var(--vp-c-text-3);
  border-radius: 20px;
  background: var(--vp-c-bg);
  font-size: 12px;
}
.mf-bus-label {
  font-weight: 600;
  margin-right: 4px;
}
.mf-msg {
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--vp-c-default-soft);
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  animation: slide 0.3s ease-out;
}
.mf-msg.active {
  background: var(--vp-c-warning-soft);
  outline: 1px solid var(--vp-c-warning-1);
}
.mf-msg small {
  font-family: var(--vp-font-family-base);
  color: var(--vp-c-text-2);
}
@keyframes slide {
  from { opacity: 0; transform: translateX(-10px); }
}
.mf-idle {
  color: var(--vp-c-text-3);
}
.mf-apps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}
.mf-app {
  padding: 8px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 12.5px;
  transition: background 0.25s, border-color 0.25s;
}
.mf-app.hit {
  border-color: var(--vp-c-success-1);
  background: var(--vp-c-success-soft);
}
.mf-app-head {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}
.mf-app-head code {
  font-size: 10.5px;
}
.mf-team {
  color: var(--vp-c-text-3);
  font-size: 11px;
}
.mf-view {
  margin: 6px 0;
  font-weight: 600;
}
.mf-subs {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.mf-subs span {
  padding: 0 5px;
  border-radius: 4px;
  background: var(--vp-c-default-soft);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--vp-c-text-2);
}
.mf-subs span.on {
  background: var(--vp-c-warning-soft);
  color: var(--vp-c-text-1);
}
</style>
