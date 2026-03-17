# RMHZ2 Engineering Web Configurator

Simple local web app to validate gripping force calculations for a single gripper model (SMC RMHZ2) before expanding to multiple models.

## Tech

- HTML
- CSS
- Vanilla JavaScript
- Chart.js (CDN)

## What it does

- Uses fixed RMHZ2 data (external/internal force, reference pressure, two fingers).
- Accepts process inputs: mass, acceleration, friction, safety factor, number of grippers, pressure, mode, and offset.
- Calculates:
  - required force per gripper,
  - available force per gripper,
  - safety margin (%),
  - SAFE / NOT SAFE status.
- Draws a bar chart comparing required vs available force.

## Run locally

```bash
python3 -m http.server 8000
```

Open: `http://localhost:8000`
