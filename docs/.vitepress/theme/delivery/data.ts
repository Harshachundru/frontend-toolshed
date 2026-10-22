import type { Step } from '../concepts/types'

export const pipelineSteps: Step[] = [
  { title: 'Push', sub: 'branch + merge request', detail: 'You push a feature branch to GitLab and open a merge request (MR). The push and the MR are the events that create a pipeline. Nothing is built on your laptop for release.' },
  { title: 'Pipeline created', sub: '.gitlab-ci.yml', detail: 'GitLab reads .gitlab-ci.yml at that commit. workflow:rules decide whether a pipeline runs at all, and each job\'s rules decide whether that job runs. Jobs are queued for a runner.' },
  { title: 'Install', sub: 'npm ci, cached', detail: 'A runner starts a fresh container (for example node:22) and runs npm ci. The npm cache is keyed on package-lock.json, so it is reused until a dependency changes.' },
  { title: 'Check', sub: 'lint, types, unit, component', detail: 'ESLint, tsc --noEmit, and Vitest with React Testing Library run in parallel jobs. They are fast, so they run on every push. A failure blocks the merge.' },
  { title: 'Build', sub: 'vite build', detail: 'The app is built once into static files in dist/. The output is passed to later jobs as an artifact, so it is not rebuilt.' },
  { title: 'E2E', sub: 'Playwright', detail: 'Playwright runs the critical journeys against the built app, either served locally in the job or deployed to a review or staging environment. Traces and screenshots are kept as artifacts when a test fails.' },
  { title: 'Image', sub: 'Kaniko or buildx', detail: 'A Dockerfile copies dist/ into an nginx image. The image is tagged with the commit SHA. Most shared runners have no Docker daemon, so the job uses Kaniko, Buildah or Docker-in-Docker.' },
  { title: 'Harbor', sub: 'push, scan, sign', detail: 'The image is pushed to a Harbor project with a robot account. Harbor scans it with Trivy, and a policy can block images with critical vulnerabilities from being pulled.' },
  { title: 'Deploy', sub: 'platform team', detail: 'The platform team\'s tooling pulls that exact tag or digest into dev, then staging, then production. The same image is promoted through each environment. Only the configuration changes.' },
  { title: 'Observe', sub: 'errors, metrics, logs', detail: 'You watch error rates, Web Vitals and logs for the new release, tagged with the same version. If they get worse, roll back by redeploying the previous tag.' },
]
