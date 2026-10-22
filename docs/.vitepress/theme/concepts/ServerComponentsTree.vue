<script setup lang="ts">
import { ref, computed } from 'vue'

interface Node { id: string; name: string; kb: number; why: string; children?: Node[] }

// kb is the compressed JS a component would cost on the client, including the libraries it imports.
const tree: Node = {
  id: 'page', name: 'ProductPage', kb: 2, why: 'awaits the database directly', children: [
    { id: 'header', name: 'Header', kb: 3, why: 'static markup', children: [
      { id: 'search', name: 'SearchBox', kb: 12, why: 'useState, onChange' },
    ] },
    { id: 'info', name: 'ProductInfo', kb: 62, why: 'renders Markdown with a 60 KB parser', children: [
      { id: 'gallery', name: 'ImageGallery', kb: 9, why: 'swipe handlers' },
      { id: 'buy', name: 'AddToCart', kb: 4, why: 'onClick, optimistic state' },
    ] },
    { id: 'reviews', name: 'Reviews', kb: 22, why: 'formats dates with a 20 KB library', children: [
      { id: 'form', name: 'ReviewForm', kb: 8, why: 'form state, validation' },
    ] },
    { id: 'footer', name: 'Footer', kb: 2, why: 'static markup' },
  ],
}
const REACT_RUNTIME = 60

// Components marked 'use client'. Everything they import becomes client code too.
const marked = ref(new Set(['search', 'gallery', 'buy', 'form']))

function toggle(id: string) {
  const next = new Set(marked.value)
  next.has(id) ? next.delete(id) : next.add(id)
  marked.value = next
}

interface Row { node: Node; depth: number; client: boolean; inherited: boolean }
const rows = computed(() => {
  const out: Row[] = []
  const walk = (n: Node, depth: number, parentClient: boolean) => {
    const client = parentClient || marked.value.has(n.id)
    out.push({ node: n, depth, client, inherited: parentClient })
    n.children?.forEach((c) => walk(c, depth + 1, client))
  }
  walk(tree, 0, false)
  return out
})

const clientKb = computed(() => {
  const own = rows.value.filter((r) => r.client).reduce((s, r) => s + r.node.kb, 0)
  return own ? own + REACT_RUNTIME : 0
})
const allClientKb = computed(() => rows.value.reduce((s, r) => s + r.node.kb, 0) + REACT_RUNTIME)
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">Where does each component run?</div>
    <div class="cc-demo-hint">Click a component to add or remove <code>'use client'</code>. Watch the JS shipped to the browser.</div>

    <div class="sc">
      <div class="sc-tree">
        <button
          v-for="r in rows"
          :key="r.node.id"
          class="sc-node"
          :class="{ client: r.client, inherited: r.inherited }"
          :style="{ marginLeft: r.depth * 22 + 'px' }"
          :disabled="r.inherited"
          @click="toggle(r.node.id)"
        >
          <span class="sc-kind">{{ r.client ? (r.inherited ? 'client (imported by a client parent)' : "'use client'") : 'server' }}</span>
          <strong>&lt;{{ r.node.name }} /&gt;</strong>
          <small>{{ r.node.why }} · {{ r.node.kb }} KB</small>
        </button>
      </div>

      <div class="sc-side">
        <div class="sc-total">
          <span>JS shipped</span>
          <strong>{{ clientKb }} KB</strong>
          <div class="sc-meter"><span :style="{ width: (clientKb / allClientKb) * 100 + '%' }" /></div>
          <small>All client: {{ allClientKb }} KB (includes {{ REACT_RUNTIME }} KB React runtime)</small>
        </div>
        <div class="cc-note">
          Server components send rendered output, not code. Keep <code>'use client'</code> on the leaves that need state or events. Mark a parent as client and its whole subtree, and its heavy imports, ship to the browser.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sc {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 14px;
}
.sc-tree {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.sc-node {
  display: grid;
  padding: 5px 10px;
  border: 1px solid var(--vp-c-divider);
  border-left: 4px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.sc-node.client {
  border-left-color: var(--vp-c-warning-1);
  background: var(--vp-c-warning-soft);
}
.sc-node.inherited {
  cursor: not-allowed;
  opacity: 0.8;
}
.sc-kind {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--vp-c-text-2);
}
.sc-node small {
  color: var(--vp-c-text-3);
}
.sc-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sc-total {
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 13px;
}
.sc-total strong {
  display: block;
  font-size: 26px;
  color: var(--vp-c-warning-1);
}
.sc-total small {
  color: var(--vp-c-text-3);
}
.sc-meter {
  height: 8px;
  margin: 6px 0;
  border-radius: 4px;
  background: var(--vp-c-default-soft);
}
.sc-meter span {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: var(--vp-c-warning-1);
  transition: width 0.4s;
}
@media (max-width: 600px) {
  .sc {
    grid-template-columns: 1fr;
  }
}
</style>
