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

        return {
            audioEnabled,
            masterVolume,
            keybindings,
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

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
