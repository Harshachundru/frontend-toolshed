<script setup lang="ts">
import { ref, computed } from 'vue'

type Layer = 'entities' | 'usecases' | 'adapters' | 'ui'
type Ui = 'React' | 'Vue' | 'Angular'
type Source = 'REST' | 'GraphQL' | 'localStorage'

const ui = ref<Ui>('React')
const source = ref<Source>('REST')
const layer = ref<Layer>('usecases')
const changed = ref<Layer | null>(null)

const rings: { id: Layer; r: number; label: () => string }[] = [
  { id: 'ui', r: 150, label: () => `UI: ${ui.value}` },
  { id: 'adapters', r: 112, label: () => `Adapter: ${source.value}` },
  { id: 'usecases', r: 74, label: () => 'Use cases + ports' },
  { id: 'entities', r: 38, label: () => 'Entities' },
]

const uiCode: Record<Ui, string> = {
  React: `function Profile({ id }: { id: string }) {
  const { data } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => loadProfile(userRepo, id),
  })
  return data && <h1>{data.user.email}</h1>
}`,
  Vue: `<script setup lang="ts">
const props = defineProps<{ id: string }>()
const profile = ref<Profile>()
onMounted(async () => {
  profile.value = await loadProfile(userRepo, props.id)
})
<\/script>`,
  Angular: `@Component({ template: '<h1>{{ (profile$ | async)?.user.email }}</h1>' })
export class ProfileComponent {
  @Input() id!: string
  profile$ = defer(() => loadProfile(userRepo, this.id))
}`,
}

const adapterCode: Record<Source, string> = {
  REST: `export const userRepo: UserRepository = {
  getById: (id) => fetch(\`/api/users/\${id}\`).then((r) => r.json()),
}`,
  GraphQL: `export const userRepo: UserRepository = {
  getById: (id) =>
    client.query({ query: USER_QUERY, variables: { id } })
      .then((r) => r.data.user),
}`,
  localStorage: `export const userRepo: UserRepository = {
  getById: async (id) =>
    JSON.parse(localStorage.getItem(\`user:\${id}\`) ?? 'null'),
}`,
}

const info = computed<Record<Layer, { title: string; text: string; code: string }>>(() => ({
  entities: {
    title: 'Entities (domain)',
    text: 'Business types and rules. Plain TypeScript with no imports from React, fetch or any library. The most stable code you have.',
    code: `export interface User { id: string; email: string; plan: 'free' | 'pro' }

export const canExport = (user: User) => user.plan === 'pro'`,
  },
  usecases: {
    title: 'Use cases and ports',
    text: 'What the app does, written against interfaces (ports). In hexagonal architecture, a port is an interface the core owns; adapters plug into it from outside.',
    code: `export interface UserRepository {          // a port
  getById(id: string): Promise<User>
}

export async function loadProfile(repo: UserRepository, id: string) {
  const user = await repo.getById(id)
  return { user, canExport: canExport(user) }
}`,
  },
  adapters: {
    title: `Adapters: ${source.value}`,
    text: 'Implement the ports with real technology: HTTP, GraphQL, storage. Swap one and nothing inside it changes.',
    code: adapterCode[source.value],
  },
  ui: {
    title: `Framework and UI: ${ui.value}`,
    text: 'The outermost ring. It calls use cases and renders the result. It is the only layer that knows which framework you use.',
    code: uiCode[ui.value],
  },
}))

function swap(kind: 'ui' | 'source', v: string) {
  if (kind === 'ui') ui.value = v as Ui
  else source.value = v as Source
  const l: Layer = kind === 'ui' ? 'ui' : 'adapters'
  layer.value = l
  changed.value = l
}
</script>

<template>
  <div class="cc-demo">
    <div class="cc-demo-title">Clean and hexagonal architecture: the onion</div>
    <div class="cc-demo-hint">Click a ring to see its code. Swap the framework or the data source and see which ring has to change.</div>

    <div class="cc-controls" role="group" aria-label="UI framework">
      <span class="on-k">UI:</span>
      <button v-for="u in ['React', 'Vue', 'Angular']" :key="u" class="cc-btn" :aria-pressed="ui === u" @click="swap('ui', u)">{{ u }}</button>
      <span class="on-k">Data:</span>
      <button v-for="s in ['REST', 'GraphQL', 'localStorage']" :key="s" class="cc-btn" :aria-pressed="source === s" @click="swap('source', s)">{{ s }}</button>
    </div>

    <div class="on">
      <svg class="cc-svg on-svg" viewBox="0 0 320 344" role="img" aria-label="Onion architecture rings">
        <g v-for="ring in rings" :key="ring.id" class="on-ring" role="button" tabindex="0" @click="layer = ring.id" @keydown.enter="layer = ring.id">
          <circle
            cx="160" cy="160" :r="ring.r"
            :class="[ring.id === layer ? 'on-sel' : 'on-plain', ring.id === changed ? 'on-changed' : '']"
            stroke-width="1.5"
          />
          <text x="160" :y="ring.id === 'entities' ? 164 : 160 - ring.r + 22" text-anchor="middle" font-size="12" font-weight="600" class="cc-ink">{{ ring.label() }}</text>
        </g>
        <text x="160" y="334" text-anchor="middle" font-size="11" class="cc-quiet">Outer rings import inner ones, never the reverse</text>
      </svg>

      <div class="on-info">
        <div class="on-title">{{ info[layer].title }}</div>
        <p>{{ info[layer].text }}</p>
        <pre><code>{{ info[layer].code }}</code></pre>
        <div v-if="changed" class="on-changed-note">
          Swap changed <strong>1 of 4 rings</strong> ({{ changed === 'ui' ? 'UI' : 'adapters' }}). Entities and use cases stayed as they were.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.on {
  display: grid;
  grid-template-columns: minmax(220px, 300px) 1fr;
  gap: 14px;
  align-items: start;
}
.on > * {
  min-width: 0;
}
.on-k {
  align-self: center;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}
.on-ring {
  cursor: pointer;
}
.on-plain {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-text-3);
}
.on-sel {
  fill: var(--vp-c-brand-soft);
  stroke: var(--vp-c-brand-1);
}
.on-changed {
  stroke: var(--vp-c-warning-1);
  stroke-width: 3;
}
circle {
  transition: fill 0.25s, stroke 0.25s;
}
.on-title {
  font-weight: 600;
}
.on-info p {
  margin: 4px 0 8px;
  font-size: 13.5px;
  line-height: 1.55;
}
.on-info pre {
  margin: 0 !important;
  padding: 10px 12px !important;
  border-radius: 8px;
  background: var(--vp-code-block-bg);
  font-size: 12px;
  line-height: 1.55;
  overflow-x: auto;
}
.on-changed-note {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--vp-c-warning-soft);
  font-size: 13px;
}
@media (max-width: 640px) {
  .on {
    grid-template-columns: minmax(0, 1fr);
  }
  .on-svg {
    max-width: 300px;
    justify-self: center;
  }
}
</style>
