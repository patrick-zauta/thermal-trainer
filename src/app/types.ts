import type { MapDefinition, MapId } from "../data/mvpMap";

export type ScreenId = "home" | "mode" | "settings" | "game" | "summary";

export enum FlightMode {
    Training = "training",
    FreeFlight = "free",
    Individual = "individual",
}

export enum ThermikVisibility {
    Visible = "visible",
    Rings = "rings",
    Hidden = "hidden",
}

export type TouchControlsMode = "auto" | "on" | "off";

export type WindConfig = {
    windEnabled: boolean;
    windSpeedMps: number;
    windDirDeg: number;
    windIndicatorEnabled: boolean;
    thermalDriftEnabled: boolean;
    thermalDriftFactor: number;
};

export type IndividualConfig = {
    thermalCount: number;
    sinkEnabled: boolean;
    thermalDynamics: "low" | "medium" | "high";
    turnpointCount: number;
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
};

export type RunConfig = {
    mode: FlightMode;
    thermikVisibility: ThermikVisibility;
    trainingStageId: number | null;
    mapId: MapId;
    wind: WindConfig;
    startWithTargetArea: boolean;
    targetAreaEnabled: boolean;
    individualConfig: IndividualConfig | null;
    randomSeed?: number;
};

export type TrackSample = {
    timeSec: number;
    x: number;
    y: number;
    vario: number;
    altitudeM: number;
};

export type RunSummary = {
    mode: FlightMode;
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
    wind: WindConfig;
};
