import { actionLabels, formatKey } from "../labels";
import { defaultSettings } from "../defaults";
import type { Action, Settings } from "../types";
import type { Screen } from "./types";

type SettingsCallbacks = {
    onUpdate: (settings: Settings) => void;
    onBack: () => void;
    onFullscreen: () => void;
};

export const createSettingsScreen = (settings: Settings, callbacks: SettingsCallbacks): Screen => {
    const screen = document.createElement("div");
    screen.className = "screen screen-settings";

    const card = document.createElement("div");
    card.className = "panel card";

    const title = document.createElement("h1");
    title.textContent = "Einstellungen";

    const audioSection = document.createElement("div");
    audioSection.className = "section";

    const audioHeader = document.createElement("h2");
    audioHeader.textContent = "Audio";

    const audioToggleRow = document.createElement("div");
    audioToggleRow.className = "row";

    const audioToggleLabel = document.createElement("span");
    audioToggleLabel.textContent = "Audio aktiv";

    const audioToggle = document.createElement("input");
    audioToggle.type = "checkbox";
    audioToggle.checked = settings.audioEnabled;

    audioToggleRow.append(audioToggleLabel, audioToggle);

    const volumeRow = document.createElement("div");
    volumeRow.className = "row";

    const volumeLabel = document.createElement("span");
    volumeLabel.textContent = "Hauptlautstaerke";

    const volumeValue = document.createElement("span");
    volumeValue.className = "value";

    const volumeSlider = document.createElement("input");
    volumeSlider.type = "range";
    volumeSlider.min = "0";
    volumeSlider.max = "100";
    volumeSlider.value = Math.round(settings.masterVolume * 100).toString();
    volumeSlider.className = "slider";
    volumeValue.textContent = `${volumeSlider.value}%`;

    volumeRow.append(volumeLabel, volumeSlider, volumeValue);

    audioSection.append(audioHeader, audioToggleRow, volumeRow);

    const screenSection = document.createElement("div");
    screenSection.className = "section";

    const screenHeader = document.createElement("h2");
    screenHeader.textContent = "Anzeige";

    const fullscreenButton = createButton("Vollbild", callbacks.onFullscreen, "secondary");
    screenSection.append(screenHeader, fullscreenButton);

    const keySection = document.createElement("div");
    keySection.className = "section";

    const keyHeader = document.createElement("h2");
    keyHeader.textContent = "Tastenbelegung";

    const keyList = document.createElement("div");
    keyList.className = "key-list";

    const warning = document.createElement("div");
    warning.className = "warning";

    let captureAction: Action | null = null;
    let currentSettings = settings;
    let currentBindings = { ...settings.keybindings };

    const updateList = (): void => {
        keyList.replaceChildren();
        (Object.keys(actionLabels) as Action[]).forEach((action) => {
            const row = document.createElement("div");
            row.className = "key-row";

            const label = document.createElement("span");
            label.textContent = actionLabels[action];

            const keyButton = createButton(formatKey(currentBindings[action]), () => {
                startCapture(action);
            }, "ghost");

            if (captureAction === action) {
                keyButton.textContent = "Taste druecken";
                keyButton.classList.add("active");
            }

            row.append(label, keyButton);
            keyList.append(row);
        });
    };

    const startCapture = (action: Action): void => {
        captureAction = action;
        warning.textContent = "Taste druecken, Esc bricht ab.";
        updateList();
    };

    const finishCapture = (code: string): void => {
        if (!captureAction) {
            return;
        }

        const duplicate = (Object.keys(currentBindings) as Action[]).find(
            (action) => currentBindings[action] === code && action !== captureAction,
        );

        if (duplicate) {
            warning.textContent = "Taste ist bereits vergeben.";
            return;
        }

        currentBindings = { ...currentBindings, [captureAction]: code };
        currentSettings = {
            ...currentSettings,
            keybindings: currentBindings,
        };
        callbacks.onUpdate(currentSettings);
        warning.textContent = "";
        captureAction = null;
        updateList();
    };

    const cancelCapture = (): void => {
        captureAction = null;
        warning.textContent = "";
        updateList();
    };

    const handleKeydown = (event: KeyboardEvent): void => {
        if (!captureAction) {
            return;
        }
        event.preventDefault();
        if (event.code === "Escape") {
            cancelCapture();
            return;
        }
        finishCapture(event.code);
    };

    window.addEventListener("keydown", handleKeydown);

    updateList();

    keySection.append(keyHeader, keyList, warning);

    const buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    const defaultsButton = createButton("Defaults wiederherstellen", () => {
        currentBindings = { ...defaultSettings.keybindings };
        currentSettings = {
            ...currentSettings,
            audioEnabled: defaultSettings.audioEnabled,
            masterVolume: defaultSettings.masterVolume,
            keybindings: currentBindings,
        };
        audioToggle.checked = currentSettings.audioEnabled;
        volumeSlider.value = Math.round(currentSettings.masterVolume * 100).toString();
        volumeValue.textContent = `${volumeSlider.value}%`;
        callbacks.onUpdate(currentSettings);
        warning.textContent = "";
        captureAction = null;
        updateList();
    }, "secondary");

    const backButton = createButton("Zurueck", callbacks.onBack, "secondary");

    buttonRow.append(defaultsButton, backButton);

    card.append(title, audioSection, screenSection, keySection, buttonRow);
    screen.append(card);

    audioToggle.addEventListener("change", () => {
        currentSettings = {
            ...currentSettings,
            audioEnabled: audioToggle.checked,
            masterVolume: clamp(Number(volumeSlider.value) / 100, 0, 1),
            keybindings: currentBindings,
        };
        callbacks.onUpdate(currentSettings);
    });

    volumeSlider.addEventListener("input", () => {
        const volume = clamp(Number(volumeSlider.value) / 100, 0, 1);
        volumeValue.textContent = `${Math.round(volume * 100)}%`;
        currentSettings = {
            ...currentSettings,
            audioEnabled: audioToggle.checked,
            masterVolume: volume,
            keybindings: currentBindings,
        };
        callbacks.onUpdate(currentSettings);
    });

    return {
        element: screen,
        dispose: () => {
            window.removeEventListener("keydown", handleKeydown);
        },
    };
};

const createButton = (label: string, onClick: () => void, variant?: "secondary" | "ghost"): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = variant ? `btn ${variant}` : "btn";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
};

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};
