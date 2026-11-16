# Harvard AI Group website

Review draft for the Harvard AI Group website. The live draft is served from `main` → `/docs` on GitHub Pages.

Edit the site under `src/`. Build the Pages files with Node.js, then commit the source and generated `docs/` together.

```sh
node build.mjs --pages-base /harvard-ai-group/
```

For a local site at the root of a static server, run `node build.mjs` and serve `dist/`.
