# Materials Intelligence Studio — public research tour

This repository contains only the static, public professor demo. The live page presents the research workflow, source-labelled saved figures, a browser-only reduced-equation calculation, and an interactive display extract of a verified COMSOL V7 silicon-temperature field.

The page does not run COMSOL or MATLAB remotely. Changing a slider updates the declared browser calculation only. The saved 3D field is one archived COMSOL result, with source hashes in [`assets/v7-public-figure-provenance.json`](assets/v7-public-figure-provenance.json).

Private C2DB records, experimental source data, full COMSOL MPH/VTU files, API keys, and unpublished measurements are excluded. Independent experimental validation is not claimed.

## Local preview

From this directory, run `python -m http.server 8767` and visit `http://127.0.0.1:8767/`. The site uses relative paths and `.nojekyll` so it also works under the GitHub Pages repository path.

## Publication

GitHub Pages publishes the `main` branch from `/` for this public repository. Changes to the scientific figures should be regenerated from verified source outputs in the private project workspace and reviewed before publication.
