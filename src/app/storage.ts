import { defaultKeybindings, defaultSettings } from "./defaults";
import type { Keybindings, Settings } from "./types";

const SETTINGS_KEY = "thermal-trainer-settings-v1";

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
        const windEnabled = typeof parsed.windEnabled === "boolean" ? parsed.windEnabled : defaultSettings.windEnabled;
        const windSpeedMps =
            typeof parsed.windSpeedMps === "number" && Number.isFinite(parsed.windSpeedMps)
                ? clamp(parsed.windSpeedMps, 0, 10)
                : defaultSettings.windSpeedMps;
        const windDirDeg =
            typeof parsed.windDirDeg === "number" && Number.isFinite(parsed.windDirDeg)
                ? clamp(Math.round(parsed.windDirDeg), 0, 359)
                : defaultSettings.windDirDeg;
        const windIndicatorEnabled =
            typeof parsed.windIndicatorEnabled === "boolean"
                ? parsed.windIndicatorEnabled
                : defaultSettings.windIndicatorEnabled;
        const thermalDriftEnabled =
            typeof parsed.thermalDriftEnabled === "boolean"
                ? parsed.thermalDriftEnabled
                : defaultSettings.thermalDriftEnabled;
        const thermalDriftFactor =
            typeof parsed.thermalDriftFactor === "number" && Number.isFinite(parsed.thermalDriftFactor)
                ? clamp(parsed.thermalDriftFactor, 0, 1)
                : defaultSettings.thermalDriftFactor;
        const windRandomEnabled =
            typeof parsed.windRandomEnabled === "boolean"
                ? parsed.windRandomEnabled
                : defaultSettings.windRandomEnabled;
        const wmtsEnabled = typeof parsed.wmtsEnabled === "boolean" ? parsed.wmtsEnabled : defaultSettings.wmtsEnabled;
        const wmtsLayer =
            parsed.wmtsLayer === "ch.swisstopo.pixelkarte-grau" || parsed.wmtsLayer === "ch.swisstopo.pixelkarte-farbe"
                ? parsed.wmtsLayer
                : defaultSettings.wmtsLayer;
        const wmtsOpacity =
            typeof parsed.wmtsOpacity === "number" && Number.isFinite(parsed.wmtsOpacity)
                ? clamp(parsed.wmtsOpacity, 0, 1)
                : defaultSettings.wmtsOpacity;

        return {
            audioEnabled,
            masterVolume,
            keybindings,
            touchControls,
            windEnabled,
            windSpeedMps,
            windDirDeg,
            windIndicatorEnabled,
            thermalDriftEnabled,
            thermalDriftFactor,
            windRandomEnabled,
            wmtsEnabled,
            wmtsLayer,
            wmtsOpacity,
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

const mergeKeybindings = (value: Partial<Keybindings> | undefined): Keybindings => {
    return {
        ...defaultKeybindings,
        ...(value ?? {}),
    };
};

const isTouchControlsMode = (value: unknown): value is Settings["touchControls"] => {
    return value === "auto" || value === "on" || value === "off";
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
