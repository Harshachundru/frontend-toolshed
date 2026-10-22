<script setup lang="ts">
import { ref, computed } from 'vue'

type Device = 'mobile' | 'desktop'
const device = ref<Device>('mobile')
const FOLD = 230

// Each block of the mock page, its height per device, and the CSS rule that styles it.
const blocks = [
  { sel: '.nav', label: 'Navigation', h: { mobile: 36, desktop: 36 }, rule: '.nav{display:flex;height:56px}' },
  { sel: '.hero', label: 'Hero heading', h: { mobile: 70, desktop: 60 }, rule: '.hero{font:700 2rem/1.2 Inter}' },
  { sel: '.hero-img', label: 'Hero image', h: { mobile: 110, desktop: 80 }, rule: '.hero-img{aspect-ratio:16/9}' },
  { sel: '.features', label: 'Feature grid', h: { mobile: 120, desktop: 50 }, rule: '.features{display:grid;gap:1rem}' },
  { sel: '.reviews', label: 'Reviews carousel', h: { mobile: 90, desktop: 60 }, rule: '.reviews{overflow-x:auto}' },
  { sel: '.footer', label: 'Footer', h: { mobile: 60, desktop: 40 }, rule: '.footer{padding:4rem 0}' },
]

const placed = computed(() => {
  let y = 0
  return blocks.map((b) => {
    const top = y
    y += b.h[device.value] + 6
    return { ...b, top, height: b.h[device.value], critical: top < FOLD }
  })
})
const critical = computed(() => placed.value.filter((b) => b.critical))
const rest = computed(() => placed.value.filter((b) => !b.critical))
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">What lands above the fold</div>
    <div class="cc-demo-hint">Switch the viewport. The rules for blocks above the dashed line are inlined; the rest load later.</div>
    <div class="cc-controls" role="group" aria-label="Viewport">
      <button class="cc-btn" :aria-pressed="device === 'mobile'" @click="device = 'mobile'">Mobile</button>
      <button class="cc-btn" :aria-pressed="device === 'desktop'" @click="device = 'desktop'">Desktop</button>
    </div>

    <div class="ccss">
      <div class="page" :class="device">
        <div
          v-for="b in placed"
          :key="b.sel"
          class="blk"
          :class="{ crit: b.critical }"
          :style="{ top: b.top + 'px', height: b.height + 'px' }"
        >{{ b.label }} <code>{{ b.sel }}</code></div>
        <div class="fold" :style="{ top: FOLD + 'px' }"><span>fold</span></div>
      </div>

      <pre class="out"><code>&lt;head&gt;
  &lt;style&gt;<span v-for="b in critical" :key="b.sel" class="hl">
    {{ b.rule }}</span>
  &lt;/style&gt;
  &lt;link rel="preload" href="/rest.[hash].css" as="style"
        onload="this.rel='stylesheet'"&gt;
&lt;/head&gt;

/* rest.[hash].css, not render-blocking */<span v-for="b in rest" :key="b.sel">
{{ b.rule }}</span></code></pre>
    </div>
  </div>
</template>

<style scoped>
.ccss {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: start;
}
.page {
  position: relative;
  height: 330px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  overflow: hidden;
  transition: width 0.3s;
}
.page.mobile { width: 170px; }
.page.desktop { width: 280px; }
.blk {
  position: absolute;
  left: 8px;
  right: 8px;
  padding: 4px 6px;
  border-radius: 5px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-3);
  font-size: 11.5px;
  transition: top 0.3s, height 0.3s, background 0.3s;
}
.blk.crit {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-text-1);
}
.blk code {
  font-size: 10.5px;
}
.fold {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 2px dashed var(--vp-c-danger-1);
}
.fold span {
  position: absolute;
  right: 6px;
  top: 2px;
  font-size: 11px;
  color: var(--vp-c-danger-1);
}
.out {
  margin: 0 !important;
  padding: 12px !important;
  border-radius: 8px;
  background: var(--vp-code-block-bg);
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
}
.hl {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
@media (max-width: 600px) {
  .ccss {
    grid-template-columns: 1fr;
  }
}
</style>
