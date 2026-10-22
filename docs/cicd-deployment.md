<script setup>
import { pipelineSteps } from './.vitepress/theme/delivery/data'
</script>

# 16. CI/CD, deployment and observability

This page follows a change from `git push` to production: a GitLab pipeline runs the checks, builds a container image, and pushes it to Harbor. A platform team then deploys the image, and you watch it in production. In this setup developers own the code, the pipeline and the image, and use the observability tools. The platform team owns servers, provisioning and rollout. The tests this pipeline runs are covered in [15. Testing](/testing).

<StepFlow title="From push to production" hint="Step through each stage. The same image moves from build to production." :steps="pipelineSteps" />

## 16.1 The vocabulary

| Term | Meaning |
| --- | --- |
| **Continuous integration (CI)** | Every push is built and tested automatically, and changes merge into `main` often, at least daily. |
| **Continuous delivery** | Every commit on `main` produces a release that *could* go to production. A person decides when. |
| **Continuous deployment** | Every commit on `main` that passes the pipeline goes to production with no manual step. |
| **Artifact** | A file a job produces and passes on, such as `dist/`, a test report or a container image. |
| **Image** | A read-only package of an app and everything it needs to run. Built from a `Dockerfile`. |
| **Container** | A running instance of an image. |
| **Registry** | A server that stores images, such as Harbor, Docker Hub or the GitLab container registry. |
| **Environment** | A place the app runs: dev, staging, production. |
| **Promotion** | Moving the same, already-tested image from one environment to the next. |

A team that says "CI/CD" but deploys by hand once a month has CI and continuous delivery, not continuous deployment. Use the right term in interviews.

## 16.2 Corrections to the common mental model

Most people describe the flow as "push to GitLab, GitLab workflows trigger actions, docker compose builds images, images go to Harbor". That is roughly right. These are the details worth getting exact:

| Common description | More accurate |
| --- | --- |
| "GitLab workflows" and "actions" | GitHub has *workflows* and *Actions*. GitLab has **pipelines**, made of **stages** and **jobs**, defined in `.gitlab-ci.yml` and run by **runners**. GitLab does have a `workflow:` keyword, but it only decides whether a pipeline is created. |
| "The push triggers the pipeline" | Several events can: a push, an MR being opened or updated, a tag, a schedule, a manual run, an API call, or another pipeline using `trigger:`. `rules:` decide which jobs run for which event. |
| "docker compose builds the images" | Compose describes how to *run* several containers together, mainly on a laptop or a single host. It can also build images, but CI usually builds each image with `docker build`, BuildKit, Kaniko or Buildah. Shared runners often have no Docker daemon, which is why Kaniko and Buildah exist. Ask your team which one the runners use. |
| "Harbour" | The project is spelled **Harbor**. Besides storing images, it scans them for vulnerabilities (Trivy), signs them, enforces retention, and grants push access to CI through robot accounts. |
| "The image is the build for one environment" | Build the image **once** and promote the same image to every environment. Only configuration differs. This is the biggest gap for frontend apps, see [16.5](#_16-5-runtime-configuration-the-frontend-trap). |
| "Deployment is the platform team's job, so it isn't mine" | They run the rollout. You still own whether the image is deployable: a health check, configuration through the environment, sensible caching headers, a version number in errors, and a rollback that works. |

## 16.3 The GitLab pipeline

`.gitlab-ci.yml` lives at the root of the repo, so the pipeline is versioned and reviewed with the code. A typical pipeline for a Vite and React app:

```yaml
# .gitlab-ci.yml
workflow:
  rules:
    # Run for merge requests, for main, and for tags. Skip duplicate branch pipelines.
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_COMMIT_TAG

stages: [check, build, e2e, package]

default:
  image: node:22-alpine
  cache:
    key:
      files: [package-lock.json]
    paths: [.npm/]
  before_script:
    - npm ci --cache .npm --prefer-offline

lint:
  stage: check
  script: npm run lint

typecheck:
  stage: check
  script: npx tsc --noEmit

unit:
  stage: check
  script: npx vitest run --coverage --reporter=junit --outputFile=junit.xml
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    when: always
    reports:
      junit: junit.xml

build:
  stage: build
  script: npm run build
  artifacts:
    paths: [dist/]
    expire_in: 1 week

e2e:
  stage: e2e
  image: mcr.microsoft.com/playwright:v1.48.0-jammy
  needs: [build]
  parallel: 2
  script:
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  artifacts:
    when: on_failure
    paths: [playwright-report/, test-results/]

image:
  stage: package
  needs: [build, e2e]
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_COMMIT_TAG
  image:
    name: gcr.io/kaniko-project/executor:v1.23.2-debug
    entrypoint: [""]
  before_script: []
  script:
    - echo "{\"auths\":{\"$HARBOR_HOST\":{\"auth\":\"$(printf '%s:%s' "$HARBOR_USER" "$HARBOR_TOKEN" | base64 | tr -d '\n')\"}}}" > /kaniko/.docker/config.json
    - /kaniko/executor
        --context "$CI_PROJECT_DIR"
        --dockerfile Dockerfile
        --destination "$HARBOR_HOST/team-web/app:$CI_COMMIT_SHORT_SHA"
        --destination "$HARBOR_HOST/team-web/app:${CI_COMMIT_TAG:-main}"
```

What each part does:

- **`workflow:rules`** stop GitLab from running two pipelines (a branch pipeline and an MR pipeline) for the same push.
- **`stages`** run in order. Jobs in the same stage run in parallel. **`needs:`** lets a job start as soon as the jobs it depends on finish, without waiting for the whole stage.
- **`cache`** keeps the npm download cache between pipelines. It is keyed on the lockfile, so it is rebuilt only when a dependency changes. Cache is a speed-up and may be missing. **`artifacts`** are guaranteed outputs passed to later jobs.
- **`reports: junit`** shows failed tests in the MR widget. The `coverage` regex shows the coverage number on the MR.
- **The image job** runs only on `main` and on tags, so MR pipelines don't fill Harbor with images nobody will deploy.
- **`$HARBOR_USER` and `$HARBOR_TOKEN`** are CI/CD variables set in the project settings, marked **masked** (hidden in logs) and **protected** (only available on protected branches and tags). They belong to a Harbor robot account that can push only to this project.

Branch protection makes this a gate. In the project settings, require a passing pipeline before an MR can merge, and protect `main` so nobody pushes to it directly.

### Other GitLab features you will meet

| Feature | Use |
| --- | --- |
| `include:` | Reuse a shared pipeline template from another repo, often one owned by the platform team. Read it, because it defines jobs you didn't write. |
| `extends:` and YAML anchors | Share settings between jobs in one file. |
| `trigger:` | Start a pipeline in another project, for example a deployment repo the platform team owns. |
| `environment:` | Records which commit is deployed where, and shows it under Operate > Environments. |
| Review apps | A temporary environment per MR, so reviewers can click through the change. |
| `when: manual` | A job that waits for someone to press play, often used for production. |
| Scheduled pipelines | Nightly full E2E runs, dependency audits, or image rebuilds to pick up base-image security fixes. |

## 16.4 The Dockerfile for a frontend app

A Dockerfile is the recipe for building an image.

### The problem: shipping the whole toolbox

- Building a React app needs Node and hundreds of megabytes of `node_modules`.
- Running it doesn't. A built SPA is just static files that any small web server can serve.

### The fix: a multi-stage build

- **Stage 1, build:** Compile the app in a Node image.
- **Stage 2, serve:** Start from a small nginx image and copy in only the built files.
- Node and `node_modules` never reach the final image, so it is small and has less to attack.

```dockerfile
# Stage 1: build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
```

In the pipeline above, `dist/` is already built, so the Dockerfile can be just the second stage. Either works. Pick one, so the code isn't built twice.

```nginx
# nginx.conf
server {
  listen 8080;
  root /usr/share/nginx/html;

  # SPA fallback: unknown paths return index.html, so client-side routes work on refresh.
  location / {
    try_files $uri /index.html;
    add_header Cache-Control "no-cache";
  }

  # Vite puts a content hash in asset file names, so they can be cached forever.
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location = /healthz {
    access_log off;
    return 200 "ok";
  }
}
```

Points that come up in review:

- **Copy the lockfile before the source.** Docker caches each layer. If only source files changed, the `npm ci` layer is reused.
- **Add a `.dockerignore`** with `node_modules`, `.git` and `dist`, so they are not sent to the build.
- **Run as non-root.** The `nginx-unprivileged` image listens on 8080 and doesn't need root.
- **`index.html` must not be cached**, or users keep loading old asset names after a deploy.
- **Pin base image versions**, and rebuild regularly to pick up security fixes.

### Tags and digests

A tag is a human-readable name for an image, such as `app:3f9c2ab`.

- **Tag with the commit SHA:** It tells you exactly which code is running. Add a version tag on releases.
- **Never deploy `latest`:** It points at a different image over time, so you can't tell what is running or roll back to it.
- **Immutable tags:** Harbor can lock tags, so a tag always points to the same image.
- **Digest:** The `sha256:...` content hash. The most exact way to name an image, because it can't point anywhere else.

### Where Docker Compose fits

Use Compose to run the app with its dependencies on your laptop or in a CI job, for example the frontend, the API and a database for E2E tests:

```yaml
# compose.yaml
services:
  web:
    build: .
    ports: ["8080:8080"]
  api:
    image: harbor.example.com/team-api/api:1.4.2
    environment:
      DATABASE_URL: postgres://app:app@db/app
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: app
```

Some teams also deploy with Compose to a single VM. Larger setups use Kubernetes, where the platform team writes the manifests or Helm charts. Ask which one yours uses, because it changes how health checks, configuration and rollbacks work.

## 16.5 Runtime configuration: the frontend trap

### The problem: Vite bakes settings into the code

- Vite replaces `import.meta.env.VITE_API_URL` with its value at build time. The URL is written into the JavaScript files.
- **Build once and promote:** Staging and production both get the API URL from the one build. Production calls the staging API.
- **Build once per environment:** Now the image you tested isn't the image you ship.

### The fix: load configuration at runtime

1. The app fetches `/config.json` before it starts, or reads `window.__CONFIG__` from a small `config.js` loaded in `index.html`.
2. When the container starts, a script writes that file from environment variables the platform team sets. The official nginx image runs `envsubst` on templates in `/etc/nginx/templates` for this.
3. The same image now runs in every environment with different settings.

### The catch

Anything in the bundle or in `config.json` is public. Never put a secret, such as an API key with write access, into frontend configuration. Secrets belong in the backend.

## 16.6 How deployment works, and what you hand over

In this setup the platform team provisions servers and runs deployments. A typical flow:

1. The pipeline pushes `app:3f9c2ab` to Harbor.
2. A deployment is triggered: the platform pipeline is started with `trigger:`, someone updates an image tag in a deployment repo (GitOps with Argo CD or Flux), or an operator runs a deploy command.
3. The image is pulled and started in dev, then staging, then production, often with a manual approval before production.
4. The orchestrator checks `/healthz` and sends traffic only to healthy containers.

Ask your platform team which of these they use. You should be able to answer: "How does my image get to production, and how do I roll back?"

What you provide for a smooth deploy:

| You provide | Why |
| --- | --- |
| An immutable image tag or digest | They deploy exactly what was tested |
| A list of runtime environment variables and their meaning | So each environment can be configured without a rebuild |
| A health check endpoint and port | So broken containers get no traffic |
| Release notes and any migration order | So backend changes go out before the frontend that depends on them |
| A rollback plan | Usually "redeploy the previous tag". It only works if the change is backwards compatible. |

### Deployment strategies

| Strategy | How it works | Trade-off |
| --- | --- | --- |
| Recreate | Stop the old version, start the new one | Simple, but has downtime |
| Rolling | Replace containers a few at a time | No downtime. Old and new versions serve users at the same time for a while. |
| Blue-green | Run the new version beside the old, then switch all traffic | Instant rollback by switching back. Needs double the capacity. |
| Canary | Send a small share of traffic to the new version, then increase it | Limits the impact of a bad release. Needs good metrics to decide. |
| Feature flags | Deploy code turned off, then turn it on for some users | Separates deploy from release. Flags must be removed later. |

### Frontend-specific deploy problems

- **Missing chunks after a deploy.** A user with the old `index.html` open navigates, and the browser requests an old chunk that no longer exists. Keep the previous release's assets for a while, for example in object storage or with a CDN, and catch `ChunkLoadError` to reload the page.
- **Old and new versions at once.** During a rolling deploy, or with a long-lived tab, the old frontend talks to the new API. Keep API changes backwards compatible: add fields, don't rename or remove them in the same release.
- **CDN caches.** If a CDN sits in front, `index.html` must not be cached there either, or purge it on each deploy.

## 16.7 Observability and monitoring

- **Monitoring:** Tells you *that* something is wrong, such as "the error rate doubled".
- **Observability:** Lets you find out *why*, from the data you already collect, without shipping new code to investigate.

As a developer you use these tools after every deploy and during incidents.

| Signal | Question it answers | Typical tools |
| --- | --- | --- |
| **Errors** | Which exceptions are users hitting, in which release? | Sentry, GlitchTip |
| **Metrics** | Is the error rate, latency or traffic normal? | Prometheus with Grafana, Datadog |
| **Logs** | What exactly happened on this request? | Loki, Elasticsearch with Kibana, Graylog |
| **Traces** | Which service made this request slow? | OpenTelemetry with Tempo or Jaeger |
| **Real-user monitoring (RUM)** | How fast is the app for real users, on real devices? | `web-vitals`, Sentry Performance, Datadog RUM |
| **Uptime and synthetic checks** | Is the site up, and does the login journey work every 5 minutes? | Uptime Kuma, Grafana synthetic monitoring, Playwright on a schedule |

Frontend errors happen in the user's browser, so server logs never see them. A frontend needs its own error reporting and RUM.

### Wire it up in the pipeline

- **Release tags.** Pass the commit SHA into the build and set it as the Sentry `release`. Every error then shows which version caused it, and you can compare releases.
- **Source maps.** Production code is minified, so stack traces are unreadable. Upload source maps to Sentry in the pipeline with `sentry-cli`. Don't serve them publicly, because they expose your source code.
- **Trace IDs.** Send a `traceparent` header with API requests. A frontend error can then be linked to the backend logs for the same request.
- **No personal data.** Scrub emails, tokens and card numbers from error reports and logs before they leave the browser.

### What to do after a deploy

1. Watch the error rate and new issues for the release in Sentry for 15 to 30 minutes.
2. Check Web Vitals and API error rates on the Grafana dashboard.
3. If something is worse, roll back first and investigate after. Turning off a feature flag is faster still.

Alerts should fire on symptoms users feel, such as error rate or p95 latency over a threshold, not on every exception. An alert nobody acts on trains people to ignore alerts. Teams that are further along define **SLOs**, for example "99.5% of page loads have no JavaScript error", and alert when the error budget is used up too fast.

## 16.8 Bottlenecks and how teams fix them

| Bottleneck | Fix |
| --- | --- |
| `npm ci` takes minutes on every job | Cache on the lockfile, or build a CI image with dependencies preinstalled |
| Every job waits for the whole previous stage | Use `needs:` to build a dependency graph |
| E2E stage takes 20 minutes | Shard with `parallel:`, move edge cases to component tests, run the full suite nightly |
| A monorepo tests everything on every change | `rules: changes:`, or Turborepo or Nx affected commands with remote caching |
| Runners queue at busy times | Ask the platform team for more runners or autoscaling, and cancel old pipelines with `interruptible: true` |
| Image builds are slow | Order Dockerfile layers so dependencies are cached, and use the Kaniko cache |
| Flaky tests block merges | Track, quarantine and fix them. Never retry until green. |
| Harbor blocks the image for a vulnerability | Update the base image or the package. If the risk is accepted, record that in Harbor's allowlist with a reason. |
| Waiting on the platform team for every deploy | Agree on self-service for dev and staging, and a manual approval only for production |

## 16.9 Interview questions

**1. Walk me through how your code gets to production.**
"I push a branch and open a merge request. GitLab runs lint, type checks and unit and component tests in parallel, then builds the app and runs Playwright on the critical journeys. The MR can't merge until that passes and someone approves it. On `main`, the pipeline builds an nginx image with Kaniko, tags it with the commit SHA and pushes it to Harbor, which scans it. The platform team deploys that tag to staging and then production. Configuration comes from environment variables at runtime, so the same image runs everywhere. After a release I watch Sentry and Grafana for that version, and roll back by redeploying the previous tag."

**2. What's the difference between continuous delivery and continuous deployment?**
Delivery means every commit on `main` is releasable and a person decides when. Deployment means every passing commit goes out automatically.

**3. Why build the image once instead of once per environment?**
So the image you tested is the image you ship. Per-environment builds can differ because of a dependency or base image update between builds. For a Vite app this means runtime config instead of build-time `VITE_` variables.

**4. Why not tag images `latest`?**
It moves. You can't tell what's running, two hosts can run different code under the same tag, and you can't roll back to it.

**5. A release breaks production. What do you do?**
Roll back first by redeploying the previous tag or turning off the feature flag. Confirm recovery in the dashboards. Tell the team. Then find the cause with the release's errors and traces, add a test for it, and write a blameless postmortem.

**6. How do you keep secrets out of a frontend build?**
Everything in the bundle is public. Secrets stay in the backend or BFF. CI secrets live in masked, protected GitLab variables and are only used by jobs that need them, such as the Harbor push.

**7. How would you speed up a slow pipeline?**
Find the slowest jobs in the pipeline view. Cache dependencies, use `needs:` for parallelism, shard E2E tests, test only affected packages on MRs, and cancel superseded pipelines.
