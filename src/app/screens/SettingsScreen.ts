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

    const controlSection = document.createElement("div");
    controlSection.className = "section";

    const controlHeader = document.createElement("h2");
    controlHeader.textContent = "Steuerung";

    const touchRow = document.createElement("div");
    touchRow.className = "row";

    const touchLabel = document.createElement("span");
    touchLabel.textContent = "Touch Steuerung";

    const touchSelect = document.createElement("select");
    touchSelect.className = "select";
    [
        { label: "Auto", value: "auto" },
        { label: "Ein", value: "on" },
        { label: "Aus", value: "off" },
    ].forEach((option) => {
        const entry = document.createElement("option");
        entry.value = option.value;
        entry.textContent = option.label;
        touchSelect.appendChild(entry);
    });
    touchSelect.value = settings.touchControls;

    touchRow.append(touchLabel, touchSelect);
    controlSection.append(controlHeader, touchRow);

    const windSection = document.createElement("div");
    windSection.className = "section";

    const windHeader = document.createElement("h2");
    windHeader.textContent = "Wind";

    const windToggleRow = document.createElement("div");
    windToggleRow.className = "row";

    const windToggleLabel = document.createElement("span");
    windToggleLabel.textContent = "Wind aktiv";

    const windToggle = document.createElement("input");
    windToggle.type = "checkbox";
    windToggle.checked = settings.windEnabled;

    windToggleRow.append(windToggleLabel, windToggle);

    const windSpeedRow = document.createElement("div");
    windSpeedRow.className = "row";

    const windSpeedLabel = document.createElement("span");
    windSpeedLabel.textContent = "Windstaerke";

    const windSpeedValue = document.createElement("span");
    windSpeedValue.className = "value";

    const windSpeedSlider = document.createElement("input");
    windSpeedSlider.type = "range";
    windSpeedSlider.min = "0";
    windSpeedSlider.max = "10";
    windSpeedSlider.step = "0.1";
    windSpeedSlider.value = settings.windSpeedMps.toFixed(1);
    windSpeedSlider.className = "slider";
    windSpeedValue.textContent = `${Number(windSpeedSlider.value).toFixed(1)} m/s`;

    windSpeedRow.append(windSpeedLabel, windSpeedSlider, windSpeedValue);

    const windDirRow = document.createElement("div");
    windDirRow.className = "row";

    const windDirLabel = document.createElement("span");
    windDirLabel.textContent = "Richtung Grad";

    const windDirControls = document.createElement("div");
    windDirControls.className = "inline-controls";

    const windDirInput = document.createElement("input");
    windDirInput.type = "number";
    windDirInput.min = "0";
    windDirInput.max = "359";
    windDirInput.step = "1";
    windDirInput.value = settings.windDirDeg.toString();
    windDirInput.className = "number-input";

    const windDirMinus = createButton("-5", () => adjustWindDir(-5), "secondary");
    windDirMinus.classList.add("small");

    const windDirPlus = createButton("+5", () => adjustWindDir(5), "secondary");
    windDirPlus.classList.add("small");

    windDirControls.append(windDirMinus, windDirInput, windDirPlus);
    windDirRow.append(windDirLabel, windDirControls);

    const windIndicatorRow = document.createElement("div");
    windIndicatorRow.className = "row";

    const windIndicatorLabel = document.createElement("span");
    windIndicatorLabel.textContent = "Windanzeige";

    const windIndicatorToggle = document.createElement("input");
    windIndicatorToggle.type = "checkbox";
    windIndicatorToggle.checked = settings.windIndicatorEnabled;

    windIndicatorRow.append(windIndicatorLabel, windIndicatorToggle);

    const windDriftRow = document.createElement("div");
    windDriftRow.className = "row";

    const windDriftLabel = document.createElement("span");
    windDriftLabel.textContent = "Thermik Drift";

    const windDriftToggle = document.createElement("input");
    windDriftToggle.type = "checkbox";
    windDriftToggle.checked = settings.thermalDriftEnabled;

    windDriftRow.append(windDriftLabel, windDriftToggle);

    const windDriftFactorRow = document.createElement("div");
    windDriftFactorRow.className = "row";

    const windDriftFactorLabel = document.createElement("span");
    windDriftFactorLabel.textContent = "Drift Faktor";

    const windDriftFactorValue = document.createElement("span");
    windDriftFactorValue.className = "value";

    const windDriftFactorSlider = document.createElement("input");
    windDriftFactorSlider.type = "range";
    windDriftFactorSlider.min = "0";
    windDriftFactorSlider.max = "1";
    windDriftFactorSlider.step = "0.05";
    windDriftFactorSlider.value = settings.thermalDriftFactor.toFixed(2);
    windDriftFactorSlider.className = "slider";
    windDriftFactorValue.textContent = windDriftFactorSlider.value;

    windDriftFactorRow.append(windDriftFactorLabel, windDriftFactorSlider, windDriftFactorValue);

    windSection.append(
        windHeader,
        windToggleRow,
        windSpeedRow,
        windDirRow,
        windIndicatorRow,
        windDriftRow,
        windDriftFactorRow,
    );

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
            touchControls: defaultSettings.touchControls,
            windEnabled: defaultSettings.windEnabled,
            windSpeedMps: defaultSettings.windSpeedMps,
            windDirDeg: defaultSettings.windDirDeg,
            windIndicatorEnabled: defaultSettings.windIndicatorEnabled,
            thermalDriftEnabled: defaultSettings.thermalDriftEnabled,
            thermalDriftFactor: defaultSettings.thermalDriftFactor,
        };
        audioToggle.checked = currentSettings.audioEnabled;
        volumeSlider.value = Math.round(currentSettings.masterVolume * 100).toString();
        volumeValue.textContent = `${volumeSlider.value}%`;
        touchSelect.value = currentSettings.touchControls;
        windToggle.checked = currentSettings.windEnabled;
        windSpeedSlider.value = currentSettings.windSpeedMps.toFixed(1);
        windSpeedValue.textContent = `${Number(windSpeedSlider.value).toFixed(1)} m/s`;
        windDirInput.value = currentSettings.windDirDeg.toString();
        windIndicatorToggle.checked = currentSettings.windIndicatorEnabled;
        windDriftToggle.checked = currentSettings.thermalDriftEnabled;
        windDriftFactorSlider.value = currentSettings.thermalDriftFactor.toFixed(2);
        windDriftFactorValue.textContent = windDriftFactorSlider.value;
        updateWindUI();
        callbacks.onUpdate(currentSettings);
        warning.textContent = "";
        captureAction = null;
        updateList();
    }, "secondary");

    const backButton = createButton("Zurueck", callbacks.onBack, "secondary");

    buttonRow.append(defaultsButton, backButton);

    card.append(title, audioSection, screenSection, controlSection, windSection, keySection, buttonRow);
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

    touchSelect.addEventListener("change", () => {
        currentSettings = {
            ...currentSettings,
            touchControls: touchSelect.value === "on" ? "on" : touchSelect.value === "off" ? "off" : "auto",
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

    const updateWindUI = (): void => {
        const windOn = windToggle.checked;
        const driftOn = windDriftToggle.checked;
        windSpeedSlider.disabled = !windOn;
        windDirInput.disabled = !windOn;
        windDirMinus.disabled = !windOn;
        windDirPlus.disabled = !windOn;
        windIndicatorToggle.disabled = !windOn;
        windDriftToggle.disabled = !windOn;
        windDriftFactorSlider.disabled = !windOn || !driftOn;
        windSection.style.opacity = windOn ? "1" : "0.6";
        windDriftFactorRow.style.display = windOn && driftOn ? "flex" : "none";
    };

    const applyWindDir = (value: number): void => {
        const next = clamp(Math.round(value), 0, 359);
        windDirInput.value = next.toString();
        currentSettings = {
            ...currentSettings,
            windDirDeg: next,
            keybindings: currentBindings,
        };
        callbacks.onUpdate(currentSettings);
    };

    function adjustWindDir(delta: number): void {
        const base = Number(windDirInput.value) || 0;
        applyWindDir(base + delta);
    }

    windToggle.addEventListener("change", () => {
        currentSettings = {
            ...currentSettings,
            windEnabled: windToggle.checked,
            keybindings: currentBindings,
        };
        updateWindUI();
        callbacks.onUpdate(currentSettings);
    });

    windSpeedSlider.addEventListener("input", () => {
        const value = clamp(Number(windSpeedSlider.value), 0, 10);
        windSpeedValue.textContent = `${value.toFixed(1)} m/s`;
        currentSettings = {
            ...currentSettings,
            windSpeedMps: value,
            keybindings: currentBindings,
        };
        callbacks.onUpdate(currentSettings);
    });

    windDirInput.addEventListener("input", () => {
        applyWindDir(Number(windDirInput.value));
    });

    windIndicatorToggle.addEventListener("change", () => {
        currentSettings = {
            ...currentSettings,
            windIndicatorEnabled: windIndicatorToggle.checked,
            keybindings: currentBindings,
        };
        callbacks.onUpdate(currentSettings);
    });

    windDriftToggle.addEventListener("change", () => {
        currentSettings = {
            ...currentSettings,
            thermalDriftEnabled: windDriftToggle.checked,
            keybindings: currentBindings,
        };
        updateWindUI();
        callbacks.onUpdate(currentSettings);
    });

    windDriftFactorSlider.addEventListener("input", () => {
        const value = clamp(Number(windDriftFactorSlider.value), 0, 1);
        windDriftFactorValue.textContent = value.toFixed(2);
        currentSettings = {
            ...currentSettings,
            thermalDriftFactor: value,
            keybindings: currentBindings,
        };
        callbacks.onUpdate(currentSettings);
    });

    updateWindUI();

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
