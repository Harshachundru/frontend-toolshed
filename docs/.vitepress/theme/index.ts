import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import EventLoopDiagram from './EventLoopDiagram.vue'
import StepFlow from './concepts/StepFlow.vue'
import SequenceDiagram from './concepts/SequenceDiagram.vue'
import CrpDiagram from './concepts/CrpDiagram.vue'
import WebVitalsDemo from './concepts/WebVitalsDemo.vue'
import LazyLoadDemo from './concepts/LazyLoadDemo.vue'
import BundleSplitDemo from './concepts/BundleSplitDemo.vue'
import CriticalCssDemo from './concepts/CriticalCssDemo.vue'
import EssentialStateDemo from './concepts/EssentialStateDemo.vue'
import ReducerDemo from './concepts/ReducerDemo.vue'
import WindowingDemo from './concepts/WindowingDemo.vue'
import RenderingTimeline from './concepts/RenderingTimeline.vue'
import ServerComponentsTree from './concepts/ServerComponentsTree.vue'
import MicroFrontendsDemo from './concepts/MicroFrontendsDemo.vue'
import ArchitectureEvolution from './architecture/ArchitectureEvolution.vue'
import RenderingPicker from './architecture/RenderingPicker.vue'
import BoundaryDemo from './architecture/BoundaryDemo.vue'
import OnionDiagram from './architecture/OnionDiagram.vue'
import AuditBuilder from './architecture/AuditBuilder.vue'
import TestingShapes from './testing/TestingShapes.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('EventLoopDiagram', EventLoopDiagram)
    app.component('StepFlow', StepFlow)
    app.component('SequenceDiagram', SequenceDiagram)
    app.component('CrpDiagram', CrpDiagram)
    app.component('WebVitalsDemo', WebVitalsDemo)
    app.component('LazyLoadDemo', LazyLoadDemo)
    app.component('BundleSplitDemo', BundleSplitDemo)
    app.component('CriticalCssDemo', CriticalCssDemo)
    app.component('EssentialStateDemo', EssentialStateDemo)
    app.component('ReducerDemo', ReducerDemo)
    app.component('WindowingDemo', WindowingDemo)
    app.component('RenderingTimeline', RenderingTimeline)
    app.component('ServerComponentsTree', ServerComponentsTree)
    app.component('MicroFrontendsDemo', MicroFrontendsDemo)
    app.component('ArchitectureEvolution', ArchitectureEvolution)
    app.component('RenderingPicker', RenderingPicker)
    app.component('BoundaryDemo', BoundaryDemo)
    app.component('OnionDiagram', OnionDiagram)
    app.component('AuditBuilder', AuditBuilder)
    app.component('TestingShapes', TestingShapes)
  },
} satisfies Theme
