import { defaultKeybindings, defaultSettings } from "./defaults";
import type { IndividualConfig, Keybindings, RunConfig, Settings, WindConfig } from "./types";
import { FlightMode, ThermikVisibility } from "./types";

const SETTINGS_KEY = "thermal-trainer-settings-v1";
const LAST_RUN_KEY = "thermal-trainer-last-run-v1";

const defaultWindConfig: WindConfig = {
    windEnabled: false,
    windSpeedMps: 0,
    windDirDeg: 90,
    windIndicatorEnabled: true,
    thermalDriftEnabled: false,
    thermalDriftFactor: 0.6,
};

const defaultIndividual: IndividualConfig = {
    thermalCount: 2,
    sinkEnabled: true,
    thermalDynamics: "medium",
    turnpointCount: 1,
    targetRadius: 50,
};

const defaultRunConfig: RunConfig = {
    mode: FlightMode.Training,
    thermikVisibility: ThermikVisibility.Visible,
    trainingStageId: 1,
    mapId: "basis",
    wind: defaultWindConfig,
    startWithTargetArea: true,
    targetAreaEnabled: true,
    individualConfig: null,
};

export const loadSettings = (): Settings => {
    if (typeof localStorage === "undefined") {
        return defaultSettings;
    }

    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) {
            return defaultSettings;
        }
        const parsed = JSON.parse(raw) as Partial<Settings> | null;
        if (!parsed || typeof parsed !== "object") {
            return defaultSettings;
        }

        const keybindings = mergeKeybindings(parsed.keybindings);
        const audioEnabled = typeof parsed.audioEnabled === "boolean" ? parsed.audioEnabled : defaultSettings.audioEnabled;
        const masterVolume =
            typeof parsed.masterVolume === "number" && Number.isFinite(parsed.masterVolume)
                ? clamp(parsed.masterVolume, 0, 1)
                : defaultSettings.masterVolume;
        const touchControls = isTouchControlsMode(parsed.touchControls)
            ? parsed.touchControls
            : defaultSettings.touchControls;
        return {
            audioEnabled,
            masterVolume,
            keybindings,
            touchControls,
        };
    } catch {
        return defaultSettings;
    }
};

export const saveSettings = (settings: Settings): void => {
    if (typeof localStorage === "undefined") {
        return;
    }

    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
        // Ignore storage errors.
    }
};

export const loadLastRunSetup = (): RunConfig => {
    if (typeof localStorage === "undefined") {
        return { ...defaultRunConfig, wind: { ...defaultRunConfig.wind } };
    }

    try {
        const raw = localStorage.getItem(LAST_RUN_KEY);
        if (!raw) {
            return { ...defaultRunConfig, wind: { ...defaultRunConfig.wind } };
        }
        const parsed = JSON.parse(raw) as Partial<RunConfig> | null;
        if (!parsed || typeof parsed !== "object") {
            return { ...defaultRunConfig, wind: { ...defaultRunConfig.wind } };
        }

        const mode = isFlightMode(parsed.mode) ? parsed.mode : defaultRunConfig.mode;
        const thermikVisibility = isThermikVisibility(parsed.thermikVisibility)
            ? parsed.thermikVisibility
            : defaultRunConfig.thermikVisibility;
        const trainingStageId =
            typeof parsed.trainingStageId === "number" && Number.isFinite(parsed.trainingStageId)
                ? clamp(Math.round(parsed.trainingStageId), 1, 10)
                : defaultRunConfig.trainingStageId;
        const mapId = typeof parsed.mapId === "string" ? parsed.mapId : defaultRunConfig.mapId;
        const wind = mergeWindConfig(parsed.wind);
        const targetAreaEnabled =
            typeof parsed.targetAreaEnabled === "boolean" ? parsed.targetAreaEnabled : defaultRunConfig.targetAreaEnabled;
        const startWithTargetArea =
            typeof parsed.startWithTargetArea === "boolean"
                ? parsed.startWithTargetArea
                : defaultRunConfig.startWithTargetArea;
        const individualConfig = parsed.individualConfig ? mergeIndividualConfig(parsed.individualConfig) : null;

        return {
            mode,
            thermikVisibility,
            trainingStageId: mode === FlightMode.FreeFlight ? null : trainingStageId,
            mapId,
            wind,
            startWithTargetArea,
            targetAreaEnabled,
            individualConfig,
        };
    } catch {
        return { ...defaultRunConfig, wind: { ...defaultRunConfig.wind } };
    }
};

export const saveLastRunSetup = (runConfig: RunConfig): void => {
    if (typeof localStorage === "undefined") {
        return;
    }

    try {
        localStorage.setItem(LAST_RUN_KEY, JSON.stringify(runConfig));
    } catch {
        // Ignore storage errors.
    }
};

const mergeKeybindings = (value: Partial<Keybindings> | undefined): Keybindings => {
    return {
        ...defaultKeybindings,
        ...(value ?? {}),
    };
};

const isTouchControlsMode = (value: unknown): value is Settings["touchControls"] => {
    return value === "auto" || value === "on" || value === "off";
};

const isFlightMode = (value: unknown): value is FlightMode => {
    return value === FlightMode.Training || value === FlightMode.FreeFlight || value === FlightMode.Individual;
};

const isThermikVisibility = (value: unknown): value is RunConfig["thermikVisibility"] => {
    return (
        value === ThermikVisibility.Visible || value === ThermikVisibility.Rings || value === ThermikVisibility.Hidden
    );
};

const mergeWindConfig = (value: Partial<WindConfig> | undefined): WindConfig => {
    const input = value ?? {};
    return {
        windEnabled: typeof input.windEnabled === "boolean" ? input.windEnabled : defaultWindConfig.windEnabled,
        windSpeedMps:
            typeof input.windSpeedMps === "number" && Number.isFinite(input.windSpeedMps)
                ? clamp(input.windSpeedMps, 0, 10)
                : defaultWindConfig.windSpeedMps,
        windDirDeg:
            typeof input.windDirDeg === "number" && Number.isFinite(input.windDirDeg)
                ? clamp(Math.round(input.windDirDeg), 0, 359)
                : defaultWindConfig.windDirDeg,
        windIndicatorEnabled:
            typeof input.windIndicatorEnabled === "boolean"
                ? input.windIndicatorEnabled
                : defaultWindConfig.windIndicatorEnabled,
        thermalDriftEnabled:
            typeof input.thermalDriftEnabled === "boolean"
                ? input.thermalDriftEnabled
                : defaultWindConfig.thermalDriftEnabled,
        thermalDriftFactor:
            typeof input.thermalDriftFactor === "number" && Number.isFinite(input.thermalDriftFactor)
                ? clamp(input.thermalDriftFactor, 0, 1)
                : defaultWindConfig.thermalDriftFactor,
    };
};

const mergeIndividualConfig = (value: Partial<IndividualConfig>): IndividualConfig => {
    return {
        thermalCount:
            typeof value.thermalCount === "number" && Number.isFinite(value.thermalCount)
                ? clamp(Math.round(value.thermalCount), 1, 3)
                : defaultIndividual.thermalCount,
        sinkEnabled: typeof value.sinkEnabled === "boolean" ? value.sinkEnabled : defaultIndividual.sinkEnabled,
        thermalDynamics:
            value.thermalDynamics === "low" || value.thermalDynamics === "high"
                ? value.thermalDynamics
                : defaultIndividual.thermalDynamics,
        turnpointCount:
            typeof value.turnpointCount === "number" && Number.isFinite(value.turnpointCount)
                ? clamp(Math.round(value.turnpointCount), 1, 2)
                : defaultIndividual.turnpointCount,
        targetRadius:
            typeof value.targetRadius === "number" && Number.isFinite(value.targetRadius)
                ? clamp(value.targetRadius, 35, 80)
                : defaultIndividual.targetRadius,
    };
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
