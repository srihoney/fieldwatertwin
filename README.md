# Field Water Twin — Cloudflare Pages V1 (fixed public output structure)

This package is structured for Cloudflare Pages when **Build output directory = `public`**.

## Repository structure

```text
public/
  index.html
  styles.css
  app.js
  fao56.js
  _headers
  data/
    crops.js
functions/
  api/
    field.js
    soil.js
    casma.js
    geocode.js
README.md
VALIDATION.md
```

## Cloudflare Pages settings

- Framework preset: None
- Root directory: leave blank / repository root
- Build command: `exit 0` (or leave blank if Cloudflare allows it)
- Build output directory: `public`

The `functions/` directory must stay at repository root. Do not move it inside `public/`.

## Why the previous deployment failed

The prior repository stored `index.html`, `app.js`, and the other site assets at the repository root, while Cloudflare was configured to publish a folder named `public`. Cloudflare compiled the Pages Functions successfully but stopped because `/public` did not exist.
