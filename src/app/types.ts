import type { MapDefinition, MapId } from "../data/mvpMap";

export type ScreenId = "home" | "mode" | "settings" | "game" | "summary";

export type ModeId = "training" | "free" | "random";

export type ThermalVisibility = "visible" | "rings" | "hidden";

export type TouchControlsMode = "auto" | "on" | "off";

export type WindSettings = {
    windEnabled: boolean;
    windSpeedMps: number;
    windDirDeg: number;
    windIndicatorEnabled: boolean;
    thermalDriftEnabled: boolean;
    thermalDriftFactor: number;
    windRandomEnabled: boolean;
};

export type RandomMapSettings = {
    thermalCount: number;
    turnpointCount: number;
    strength: number;
    targetRadius: number;
};

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
    windEnabled: boolean;
    windSpeedMps: number;
    windDirDeg: number;
    windIndicatorEnabled: boolean;
    thermalDriftEnabled: boolean;
    thermalDriftFactor: number;
    windRandomEnabled: boolean;
    wmtsEnabled: boolean;
    wmtsLayer: string;
    wmtsOpacity: number;
};

export type ModeSelection = {
    mode: ModeId;
    thermalVisibility: ThermalVisibility;
    mapId: MapId;
    trainingStage: 1 | 2;
    randomSettings: RandomMapSettings;
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
    mapId: MapId;
    mapDefinition: MapDefinition;
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
    wind: WindSettings;
};
