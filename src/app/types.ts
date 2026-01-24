export type ScreenId = "home" | "mode" | "settings" | "game" | "summary";

export type ModeId = "training" | "free";

export type ThermalVisibility = "visible" | "rings" | "hidden";

export type TouchControlsMode = "auto" | "on" | "off";

export type Action =
    | "LeftBrakeIncrease"
    | "LeftBrakeDecrease"
    | "RightBrakeIncrease"
    | "RightBrakeDecrease"
    | "Speedbar"
    | "Pause"
    | "DebugToggle";

export type Keybindings = Record<Action, string>;

export type Settings = {
    audioEnabled: boolean;
    masterVolume: number;
    keybindings: Keybindings;
    touchControls: TouchControlsMode;
};

export type ModeSelection = {
    mode: ModeId;
    thermalVisibility: ThermalVisibility;
};

export type TrackSample = {
    timeSec: number;
    x: number;
    y: number;
    vario: number;
    altitudeM: number;
};

export type RunSummary = {
    mode: ModeId;
    durationSec: number;
    startAltitudeM: number;
    endAltitudeM: number;
    maxAltitudeM: number;
    netAltitudeM: number;
    avgClimbMps: number;
    timeClimbSec: number;
    timeSinkSec: number;
    stallCount: number;
    targetReached: boolean;
    samples: TrackSample[];
};
