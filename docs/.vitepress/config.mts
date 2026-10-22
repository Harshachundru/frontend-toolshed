import { defineConfig } from 'vitepress'
import taskLists from 'markdown-it-task-lists'

export default defineConfig({
  title: 'Frontend Interview Guide',
  description: 'JavaScript, TypeScript, React, CSS, HTML, browser security and performance, with interview questions and STAR stories.',
  // GitHub Pages serves a project site at /<repo-name>/; the deploy workflow sets this.
  base: process.env.BASE_PATH ?? '/',
  cleanUrls: true,
  lastUpdated: true,

  markdown: {
    config: (md) => md.use(taskLists, { enabled: true, label: true }),
  },

  themeConfig: {
    nav: [
      { text: 'Start here', link: '/how-to-use' },
      { text: 'Core concepts', link: '/core-concepts' },
      { text: 'Architecture', link: '/architecture-patterns' },
      { text: 'Testing', link: '/testing' },
      { text: 'CI/CD', link: '/cicd-deployment' },
      { text: 'JavaScript', link: '/javascript' },
      { text: 'React', link: '/react-core' },
      { text: 'STAR bank', link: '/behavioural-star' },
    ],

    sidebar: [
      {
        text: 'Getting started',
        items: [
          { text: 'How to use this guide', link: '/how-to-use' },
          { text: '15 core frontend concepts', link: '/core-concepts' },
          { text: 'Frontend architecture patterns', link: '/architecture-patterns' },
        ],
      },
      {
        text: 'Languages',
        items: [
          { text: '1. JavaScript', link: '/javascript' },
          { text: '2. TypeScript', link: '/typescript' },
        ],
      },
      {
        text: 'React',
        items: [
          { text: '3. React core', link: '/react-core' },
          { text: '4. State management', link: '/react-state' },
          { text: '5. Advanced React', link: '/react-advanced' },
        ],
      },
      {
        text: 'The web platform',
        items: [
          { text: '6. HTML and accessibility', link: '/html-accessibility' },
          { text: '7. CSS', link: '/css' },
          { text: '8. Browser and security', link: '/browser-security' },
        ],
      },
      {
        text: 'Beyond the code',
        items: [
          { text: '9. Performance', link: '/performance' },
          { text: '10. Real-world skills', link: '/real-world-skills' },
          { text: '11. STAR bank and checklist', link: '/behavioural-star' },
        ],
      },
      {
        text: 'Shipping',
        items: [
          { text: '15. Testing', link: '/testing' },
          { text: '16. CI/CD, deployment and observability', link: '/cicd-deployment' },
        ],
      },
      {
        text: 'Role prep',
        items: [
          { text: '12. Resume STAR questions', link: '/resume-star' },
          { text: '13. Full-stack TypeScript and payments', link: '/fintech-fullstack-ts' },
          { text: '14. Apata interview questions', link: '/apata-interview' },
        ],
      },
    ],

    outline: { level: [2, 3], label: 'On this page' },
    search: { provider: 'local' },
    docFooter: { prev: 'Previous', next: 'Next' },
  },
})
