# Frontend Interview Guide

A study guide for frontend interviews covering JavaScript, TypeScript, React, HTML, CSS, browser security and performance. Each topic explains the idea, then lists interview questions with model answers, then gives a STAR story to adapt. It is a [VitePress](https://vitepress.dev) site: you edit Markdown files, and GitHub Pages publishes them.

## Read and edit it on your machine

You need Node.js 20 or later.

```sh
npm install
npm run dev
```

Open the address it prints, usually <http://localhost:5173>. Each page lives in `docs/` as a Markdown file, for example `docs/javascript.md`. When you save a file, the page in your browser updates straight away.

To add a page, create a Markdown file in `docs/` and add it to the `sidebar` list in `docs/.vitepress/config.mts`.

## Publish it to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the site and publishes it every time you push to `main`. You set it up once:

1. Create an empty repository on GitHub, for example `frontend-interview-guide`. On a free account it must be public for Pages to work.
2. Push this folder to it:

    ```sh
    git remote add origin https://github.com/<your-username>/frontend-interview-guide.git
    git push -u origin main
    ```

3. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to finish. If it ran before step 3 and failed, click **Re-run all jobs**.

The site is then live at `https://<Harshachundru>.github.io/frontend-interview-guide/`. After that, every `git push` updates it within a minute or two.

## Check a build before you push

```sh
npm run build
npm run preview
```

This builds the site the way GitHub does and serves it locally, so you can catch a broken page before it goes live.
