# Field Water Twin — Irrigation Digital Twin V1

A zero-input-first irrigation decision-support prototype designed for **GitHub + Cloudflare Pages at $0 hosting cost** for modest research/non-commercial usage.

## What Version 1 does

A user can click inside a U.S. agricultural field and the app attempts to build a first irrigation model automatically from public data:

1. **Field + crop history** — USDA NASS Crop Sequence Boundaries (CSB). The adapter tries a 2025 ArcGIS feature-service path first and falls back to the verified 2024 public ArcGIS service if the newer endpoint is not exposed under that path.
2. **Soil** — USDA NRCS Soil Data Access / SSURGO dominant mapped soil component and horizons.
3. **Plant + satellite** — USDA NASS Crop-CASMA, using NASA MODIS NDVI and NASA SMAP root-zone soil moisture time series.
4. **Atmosphere** — Open-Meteo historical/reanalysis and 14-day forecast, including FAO-56 ETo.
5. **Physics** — Browser-side FAO-56-style single-crop-coefficient root-zone water balance with depletion stress coefficient, dynamic Kc nudged by recent NDVI, and initial depletion anchored by SMAP when available.
6. **Decision** — irrigation timing, estimated gross irrigation depth, 14-day depletion outlook, confidence score, provenance, and editable crop/soil assumptions.

It does **not require** a user to upload `.par`, `.wth`, `.sol`, or `.irr` files.

## Important scientific scope

This is intentionally **Version 1**, not a claim to reproduce every pyfao56 feature. It implements a transparent, compact FAO-56-style root-zone balance in JavaScript so the computational workload runs in the user's browser instead of a paid server.

The uploaded pyfao56 package was used as the scientific reference for crop defaults and model structure. Crop preset values in `data/crops.js` were assembled from the package's FAO-56 Table 11/12/17/22 data where available.

V1 currently uses a **single Kc** water-balance simplification, with FAO-56 depletion stress logic. A later release can add the full dual-Kc evaporation layer, runoff, layered water balance, irrigation event reconstruction, Sentinel-1/2 field-scale assimilation, and uncertainty ensembles.

## Folder structure

```text
index.html
styles.css
app.js
fao56.js
data/
  crops.js
functions/
  api/
    field.js
    soil.js
    casma.js
    geocode.js
```

No Node/npm build is required.

## Deploy on Cloudflare Pages from GitHub

1. Create a new GitHub repository.
2. Upload all files in this folder **without changing the folder structure**.
3. In Cloudflare Dashboard, open **Workers & Pages → Create → Pages → Connect to Git**.
4. Select the GitHub repository.
5. Framework preset: **None**.
6. Build command: leave blank.
7. Build output directory: `/` (repository root). If the Cloudflare UI requires a value, use `.`.
8. Deploy.

The `/functions/api/*.js` files become Cloudflare Pages Functions automatically.

## Local testing

Because `/api/*` routes are Cloudflare Pages Functions, opening `index.html` directly will show the UI but the USDA proxy functions will not work. For a full local test use Wrangler Pages development mode, or deploy the repository to Cloudflare Pages.

## Why Cloudflare Functions are used

The browser directly requests Open-Meteo, but several public-data services are proxied through Cloudflare Functions for CORS consistency and compact response handling. Heavy calculations remain in the browser.

## Data-source behavior and fallbacks

The app is designed to **degrade gracefully**:

- No CSB field match → point mode.
- SSURGO unavailable → generic loam FC=0.27, WP=0.12.
- Crop-CASMA unavailable → standard crop curve + conservative initial depletion.
- Live weather unavailable → a clearly labeled synthetic interface fallback is shown; it must not be used operationally.
- Latest CSB crop history is evidence, not proof of the current year's annual crop; users can change the crop.

## Recommended first validation before public release

Test at least 20–30 known fields representing annual crops and orchards. For each field compare:

- CSB polygon and crop history against known field information.
- SSURGO soil properties against Web Soil Survey / known lab data.
- Crop-CASMA NDVI/SMAP response against the USDA viewer.
- ETo values against a trusted local station (e.g., CIMIS in California).
- Browser water-balance output against a matched pyfao56 test case.

Only after those checks should V1 be labeled as a public beta.

## License / attribution

Before public release, choose a repository license appropriate for your project and retain attribution to FAO-56, pyfao56, USDA NASS, USDA NRCS, NASA, Open-Meteo, OpenStreetMap, and the relevant data products in the application About page.
