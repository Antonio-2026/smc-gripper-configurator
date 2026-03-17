# SMC Gripper Engineering Web Configurator

Local web app to validate gripping force calculations across multiple gripper models using a JSON-based model database.

## Tech

- HTML
- CSS
- Vanilla JavaScript
- Chart.js (CDN)
- JSON model dataset (`grippers.json`)

## What it does

- Loads multiple grippers from JSON with these fields:
  - `model`
  - `fingers`
  - `allows_parallel`
  - `gripping_force_external_per_finger`
  - `gripping_force_internal_per_finger`
  - `reference_pressure`
- Calculates required force:
  - `F_required = safety_factor × (mass × 9.81 / friction)`
- Calculates available force:
  - `F_available = force_per_finger × number_of_fingers × pressure_ratio × number_of_grippers`
- Enforces 3-finger gripper rule:
  - forced `number_of_grippers = 1`
  - parallel selection disabled
- Automatically recommends best gripper:
  - filters SAFE options
  - sorts by lowest excess force
  - highlights best option in cards and table
- Displays a comparison table of all valid grippers.

## Run locally

```bash
python3 -m http.server 8000
```

Open: `http://localhost:8000`
