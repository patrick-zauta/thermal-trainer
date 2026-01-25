import type { Keybindings, Settings } from "./types";

export const defaultKeybindings: Keybindings = {
    LeftBrakeIncrease: "KeyA",
    LeftBrakeDecrease: "KeyQ",
    RightBrakeIncrease: "KeyL",
    RightBrakeDecrease: "KeyP",
    Speedbar: "Space",
    Pause: "Escape",
    DebugToggle: "KeyD",
};

export const defaultSettings: Settings = {
    audioEnabled: true,
    masterVolume: 0.6,
    keybindings: defaultKeybindings,
    touchControls: "auto",
    windEnabled: false,
    windSpeedMps: 0,
    windDirDeg: 0,
    windIndicatorEnabled: true,
    thermalDriftEnabled: false,
    thermalDriftFactor: 0.6,
};
