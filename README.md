# TBeam

TBeam is a professional cast-in-place reinforced concrete T-beam design application for flexural and shear capacity checks based on the AASHTO LRFD Bridge Design Specifications, 9th Edition.

## Architecture

- `src/analysis`: orchestrates the engineering workflow and design summary.
- `src/geometry`: derives section properties, beta1, and effective dimensions.
- `src/reinforcement`: resolves bar sizes, top/bottom layer geometry, actual bar elevations, stirrup properties, and section bar placement.
- `src/flexure`: solves the neutral axis with layer-by-layer strain compatibility and computes `Mn` and `phiMn`.
- `src/shear`: evaluates `Vc`, `Vs`, `Vn`, and `phiVn` using editable AASHTO shear parameters.
- `src/drawings`: generates parametric SVG drawings for the section, flexural strain-compatibility diagram, and shear reinforcement elevation.
- `src/report`: builds a print-ready report window plus downloadable standalone report files with drawings, equations, and logo support.
- `src/ui`: renders the engineering interface and LaTeX equations.
- `src/state`: stores defaults, local persistence, and state normalization for legacy-to-layered reinforcement migration.

## Engineering Engine

### Flexural capacity

The flexural engine:

1. derives steel areas and actual top/bottom layer centroids from the layer layout;
2. applies a Whitney stress block with AASHTO-compatible `beta1`;
3. solves the neutral axis depth `c` by strain compatibility and force equilibrium using every reinforcement layer independently;
4. handles both cases where the compression block remains in the flange and where it extends into the web;
5. computes resultants, lever arm, `Mn`, `phiMn`, and the full step-by-step calculation package.

### Shear capacity

The shear engine:

1. computes `dv` from the flexural solution;
2. calculates concrete contribution `Vc`;
3. calculates stirrup contribution `Vs`;
4. limits `Vn` by `0.25 f'c bw dv`;
5. reports `phiVn` and the calculation sequence.

Because the app is organized as a member-capacity tool rather than a demand-check workflow, the AASHTO shear parameters `beta` and `theta` are surfaced as editable inputs and documented in the interface/report.

## Report workflow

- `Open Report` launches the live branded report in a new tab.
- `Save Report` downloads a standalone HTML calculation package.
- `Print / PDF` opens the report and triggers the browser print dialog.
- The report header supports an uploaded company logo and company name.

## Running locally

```bash
npm test
npm run serve
```

Open `http://localhost:4173`.

## GitHub Pages

The repo includes `.github/workflows/pages.yml`, which deploys the static site from the `main` branch to GitHub Pages on every push.
