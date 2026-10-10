# Mission27 + teammate build: integration notes

## Base project
This merged build keeps the original `M27 - New` project as the base so its React Three Fiber world, movement, mission/training navigation, resource systems, objective flow, saves, audio, and existing UI remain in place.

## Adapted from the teammate project
A new `src/game/ui/AdvancedOpsPanel.tsx` adapts ideas from the teammate's mission HUD, Field Manual, and Crew Net preview into a console connected to Mission27's existing Zustand mission state.

The console includes:
- **Telemetry:** current simulated resource reserves, crew stability, XP, objectives, samples, science, emergency count, active alert, and recent mission event log.
- **Response Protocols:** concise response cards for depressurization, solar particle events, power failure, greenhouse crop stress, and EVA cooling failure.
- **Crew Net:** Mission27's existing Maya, Leo, Nova, and Ari crew roster with role-specific operational priorities.

The console is opened with the new **OPS CONSOLE** button during the lunar mission and can be closed with its CLOSE button.

## Important distinction
Telemetry is explicitly labelled as game simulation data; it is not real spacecraft telemetry. The response cards are educational guidance, not official NASA procedures. The teammate's separate SceneManager and ScenarioEngine were not transplanted wholesale because they run a separate game loop and state model; replacing Mission27's world with them would risk breaking the existing game.

## Build verification
The source integration has been written, but a production build could not be verified in this environment because dependencies could not be installed before the install command timed out. After extracting, run `npm install` and `npm run build`; resolve any dependency/network setup issue first if installation fails.
