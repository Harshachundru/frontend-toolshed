import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import EventLoopDiagram from './EventLoopDiagram.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('EventLoopDiagram', EventLoopDiagram)
  },
} satisfies Theme
