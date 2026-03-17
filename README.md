# SMC Gripper Configurator

Interactive single-page configurator for matching collaborative robots with SMC grippers.

## Features

- 3D-style robot and gripper illustration that updates with orientation and stroke.
- Advanced engineering controls for mass, acceleration, friction, finger length, orientation, and safety factor.
- Dynamic envelope graph plotting available vs required gripping force in real time.
- Recommendation engine that ranks top robot + gripper combinations from the current process inputs.
- Responsive dashboard layout for desktop/tablet/mobile use.

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
